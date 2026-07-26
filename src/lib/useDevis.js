import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { todayISO } from "./helpers";

const DEVIS_SELECT = `
  id, numero, client_id, date, statut, created_by, projet_id,
  devis_lignes ( id, produit_id, nom, prix_ht, tva, qty, remise,
    devis_details ( id, label, prix ) ),
  devis_historique ( date, action, detail )
`;

function mapRow(row) {
  return {
    uuid: row.id,
    id: row.numero,
    clientId: row.client_id,
    date: row.date,
    statut: row.statut,
    projetId: row.projet_id,
    lignes: (row.devis_lignes || []).map((l) => ({
      id: l.id,
      produitId: l.produit_id,
      nom: l.nom,
      prixHT: Number(l.prix_ht),
      tva: Number(l.tva),
      qty: Number(l.qty),
      remise: Number(l.remise),
      details: (l.devis_details || []).map((d) => ({ id: d.id, label: d.label, prix: Number(d.prix) })),
    })),
    historique: (row.devis_historique || []).sort((a, b) => (a.date > b.date ? 1 : -1)),
  };
}

// Réserve le prochain numéro de devis pour l'entreprise et incrémente
// son compteur dédié (indépendant de celui des factures).
async function reserverNumeroDevis(entrepriseId) {
  const { data: ent, error } = await supabase
    .from("entreprises")
    .select("prochain_numero_devis, prefixe_devis")
    .eq("id", entrepriseId)
    .single();
  if (error) throw error;
  const numero = `${ent.prefixe_devis}${String(ent.prochain_numero_devis).padStart(3, "0")}`;
  const { error: updError } = await supabase
    .from("entreprises")
    .update({ prochain_numero_devis: ent.prochain_numero_devis + 1 })
    .eq("id", entrepriseId);
  if (updError) throw updError;
  return numero;
}

async function insertLignes(table, detailsTable, parentIdField, parentId, lignes) {
  for (const l of lignes) {
    const { data: ligne } = await supabase.from(table).insert({
      [parentIdField]: parentId, produit_id: l.produitId, nom: l.nom,
      prix_ht: l.prixHT, tva: l.tva, qty: l.qty, remise: l.remise,
    }).select().single();
    if (l.details && l.details.length) {
      await supabase.from(detailsTable).insert(
        l.details.map((d) => ({ ligne_id: ligne.id, label: d.label, prix: Number(d.prix || 0) }))
      );
    }
  }
}

export function useDevis(entrepriseId, userId) {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase
      .from("devis")
      .select(DEVIS_SELECT)
      .eq("entreprise_id", entrepriseId)
      .order("date", { ascending: false });
    if (!error) setDevis(data.map(mapRow));
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  // Crée un nouveau devis (brouillon ou envoyé directement), avec un
  // rattachement optionnel à un projet dès la création.
  const createDevis = async ({ clientId, lignes, statut, projetId }) => {
    const numero = await reserverNumeroDevis(entrepriseId);
    const { data: d } = await supabase.from("devis").insert({
      numero, entreprise_id: entrepriseId, client_id: clientId,
      date: todayISO(), statut, created_by: userId, projet_id: projetId || null,
    }).select().single();

    await insertLignes("devis_lignes", "devis_details", "devis_id", d.id, lignes);

    const historique = [{ devis_id: d.id, date: todayISO(), action: "Création", detail: "Devis créé en statut Brouillon", created_by: userId }];
    if (statut === "Envoyé") historique.push({ devis_id: d.id, date: todayISO(), action: "Envoi", detail: "Devis envoyé au client par e-mail", created_by: userId });
    await supabase.from("devis_historique").insert(historique);

    await load();
  };

  // Met à jour un devis existant (Brouillon ou Envoyé uniquement — la
  // policy RLS "devis: modification admin/commercial" refusera silencieusement
  // toute autre tentative côté serveur).
  const updateDevis = async (existing, { clientId, lignes, statut, projetId }) => {
    await supabase.from("devis").update({ client_id: clientId, statut, projet_id: projetId ?? existing.projetId ?? null }).eq("id", existing.uuid);

    // Remplacement complet des lignes (plus simple et sûr qu'un diff) —
    // la suppression cascade jusqu'aux devis_details grâce aux FK.
    await supabase.from("devis_lignes").delete().eq("devis_id", existing.uuid);
    await insertLignes("devis_lignes", "devis_details", "devis_id", existing.uuid, lignes);

    const historique = [{
      devis_id: existing.uuid, date: todayISO(),
      action: "Modification",
      detail: existing.statut === "Envoyé" ? "Devis modifié à la demande du client" : "Brouillon mis à jour",
      created_by: userId,
    }];
    if (statut === "Envoyé" && existing.statut === "Brouillon") {
      historique.push({ devis_id: existing.uuid, date: todayISO(), action: "Envoi", detail: "Devis envoyé au client par e-mail", created_by: userId });
    }
    await supabase.from("devis_historique").insert(historique);

    await load();
  };

  // Marque un devis comme Accepté et journalise sa transformation en facture.
  const marquerTransforme = async (existing, factureNumero) => {
    await supabase.from("devis").update({ statut: "Accepté" }).eq("id", existing.uuid);
    await supabase.from("devis_historique").insert({
      devis_id: existing.uuid, date: todayISO(), action: "Facturation",
      detail: `Transformé en facture ${factureNumero}`, created_by: userId,
    });
    await load();
  };

  // Rattache (ou détache si projetId est null) un devis existant à un projet,
  // utilisé depuis l'écran Projets pour relier rétroactivement un ancien devis.
  const lierProjet = async (existing, projetId) => {
    const { error } = await supabase.from("devis").update({ projet_id: projetId }).eq("id", existing.uuid);
    if (!error) await load();
    return { error };
  };

  return { devis, createDevis, updateDevis, marquerTransforme, lierProjet, loading, reload: load };
}
