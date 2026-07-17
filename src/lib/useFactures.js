import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { todayISO, totals } from "./helpers";

const FACTURE_SELECT = `
  id, numero, client_id, date, echeance, statut, montant_regle, created_by,
  facture_lignes ( id, produit_id, nom, prix_ht, tva, qty, remise,
    facture_details ( id, label, prix ) )
`;

function mapRow(row) {
  return {
    uuid: row.id,
    id: row.numero,
    clientId: row.client_id,
    date: row.date,
    echeance: row.echeance,
    statut: row.statut,
    regle: row.montant_regle,
    lignes: (row.facture_lignes || []).map((l) => ({
      id: l.id,
      produitId: l.produit_id,
      nom: l.nom,
      prixHT: Number(l.prix_ht),
      tva: Number(l.tva),
      qty: Number(l.qty),
      remise: Number(l.remise),
      details: (l.facture_details || []).map((d) => ({ id: d.id, label: d.label, prix: Number(d.prix) })),
    })),
  };
}

async function insertLignes(parentId, lignes) {
  for (const l of lignes) {
    const { data: ligne } = await supabase.from("facture_lignes").insert({
      facture_id: parentId, produit_id: l.produitId, nom: l.nom,
      prix_ht: l.prixHT, tva: l.tva, qty: l.qty, remise: l.remise,
    }).select().single();
    if (l.details && l.details.length) {
      await supabase.from("facture_details").insert(
        l.details.map((d) => ({ ligne_id: ligne.id, label: d.label, prix: Number(d.prix || 0) }))
      );
    }
  }
}

export function useFactures(entrepriseId, userId) {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase
      .from("factures")
      .select(FACTURE_SELECT)
      .eq("entreprise_id", entrepriseId)
      .order("date", { ascending: false });
    if (!error) setFactures(data.map(mapRow));
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const reserverNumeroFacture = async () => {
    const { data: ent } = await supabase
      .from("entreprises").select("prochain_numero, prefixe_facture").eq("id", entrepriseId).single();
    const numero = `${ent.prefixe_facture}${String(ent.prochain_numero).padStart(3, "0")}`;
    await supabase.from("entreprises").update({ prochain_numero: ent.prochain_numero + 1 }).eq("id", entrepriseId);
    return numero;
  };

  const createFacture = async ({ clientId, lignes, statut }) => {
    const numero = await reserverNumeroFacture();
    const echeance = new Date(); echeance.setDate(echeance.getDate() + 30);
    const { data: f } = await supabase.from("factures").insert({
      numero, entreprise_id: entrepriseId, client_id: clientId, date: todayISO(),
      echeance: echeance.toISOString().slice(0, 10), statut, created_by: userId,
    }).select().single();
    await insertLignes(f.id, lignes);
    await load();
    return numero;
  };

  // Utilisée par Devis → "Facturer" : crée directement une facture Envoyée
  // à partir des lignes d'un devis accepté.
  const creerDepuisDevis = async (devisObj) => createFacture({
    clientId: devisObj.clientId, lignes: devisObj.lignes, statut: "Envoyée",
  });

  const enregistrerPaiement = async (facture, montant, mode) => {
    const t = totals(facture.lignes).ttc;
    const nouveauRegle = (facture.regle || 0) + Number(montant);
    const nouveauStatut = nouveauRegle >= t ? "Payée" : "Partiellement payée";
    await supabase.from("factures").update({ montant_regle: nouveauRegle, statut: nouveauStatut }).eq("id", facture.uuid);
    await supabase.from("paiements").insert({ facture_id: facture.uuid, montant: Number(montant), mode, date: todayISO(), created_by: userId });
    await load();
  };

  return { factures, createFacture, creerDepuisDevis, enregistrerPaiement, loading, reload: load };
}
