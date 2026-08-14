import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { todayISO, totals } from "./helpers";
import { cacheGet, cacheSet, enqueueAction } from "./offline";

const FACTURE_SELECT = `
  id, numero, client_id, date, echeance, statut, montant_regle, created_by,
  projet_termine, termine_le, projet_id,
  facture_lignes ( id, produit_id, nom, description, prix_ht, tva, qty, remise )
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
    projetTermine: row.projet_termine,
    termineLe: row.termine_le,
    projetId: row.projet_id,
    lignes: (row.facture_lignes || []).map((l) => ({
      id: l.id,
      produitId: l.produit_id,
      nom: l.nom,
      description: l.description || "",
      prixHT: Number(l.prix_ht),
      tva: Number(l.tva),
      qty: Number(l.qty),
      remise: Number(l.remise),
    })),
  };
}

async function insertLignes(parentId, lignes) {
  await supabase.from("facture_lignes").insert(lignes.map((l) => ({
    facture_id: parentId, produit_id: l.produitId, nom: l.nom, description: l.description || "",
    prix_ht: l.prixHT, tva: l.tva, qty: l.qty, remise: l.remise,
  })));
}

export function useFactures(entrepriseId, userId) {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);

  const cacheKey = `factures:${entrepriseId}`;

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    try {
      const { data, error } = await supabase.from("factures").select(FACTURE_SELECT).eq("entreprise_id", entrepriseId).order("date", { ascending: false });
      if (error) throw error;
      const mapped = data.map(mapRow);
      setFactures(mapped); cacheSet(cacheKey, mapped);
    } catch {
      const cached = cacheGet(cacheKey);
      if (cached) setFactures(cached);
    }
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const reserverNumeroFacture = async () => {
    const { data: ent, error } = await supabase
      .from("entreprises").select("prochain_numero_facture, prefixe_facture").eq("id", entrepriseId).single();
    if (error) throw error;
    const numero = `${ent.prefixe_facture}${String(ent.prochain_numero_facture).padStart(3, "0")}`;
    const { error: updError } = await supabase
      .from("entreprises").update({ prochain_numero_facture: ent.prochain_numero_facture + 1 }).eq("id", entrepriseId);
    if (updError) throw updError;
    return numero;
  };

  const createFacture = async ({ clientId, lignes, statut, projetId }) => {
    const numero = await reserverNumeroFacture();
    const echeance = new Date(); echeance.setDate(echeance.getDate() + 30);
    const { data: f } = await supabase.from("factures").insert({
      numero, entreprise_id: entrepriseId, client_id: clientId, date: todayISO(),
      echeance: echeance.toISOString().slice(0, 10), statut, created_by: userId, projet_id: projetId || null,
    }).select().single();
    await insertLignes(f.id, lignes);
    await load();
    return numero;
  };

  // Utilisée par Devis → "Facturer" : crée directement une facture Envoyée
  // à partir des lignes d'un devis accepté, en conservant le même projet.
  const creerDepuisDevis = async (devisObj) => createFacture({
    clientId: devisObj.clientId, lignes: devisObj.lignes, statut: "Envoyée", projetId: devisObj.projetId,
  });

  const enregistrerPaiement = async (facture, montant, mode, date) => {
    const t = totals(facture.lignes).ttc;
    const nouveauRegle = (facture.regle || 0) + Number(montant);
    const nouveauStatut = nouveauRegle >= t ? "Payée" : "Partiellement payée";
    const finalDate = date || todayISO();

    if (!navigator.onLine) {
      // Encaissement chez le client sans réseau : les valeurs finales sont déjà
      // calculées ici, donc la synchronisation au retour du réseau se fait par
      // simple rejeu — pas besoin de recalculer quoi que ce soit.
      enqueueAction("enregistrerPaiement", { factureUuid: facture.uuid, montant, mode, date: finalDate, nouveauRegle, nouveauStatut },
        `Paiement ${facture.id} : ${montant} FCFA`);
      const next = factures.map((f) => f.uuid === facture.uuid ? { ...f, regle: nouveauRegle, statut: nouveauStatut } : f);
      setFactures(next); cacheSet(cacheKey, next);
      return;
    }

    await supabase.from("factures").update({ montant_regle: nouveauRegle, statut: nouveauStatut }).eq("id", facture.uuid);
    await supabase.from("paiements").insert({ facture_id: facture.uuid, montant: Number(montant), mode, date: finalDate, created_by: userId });
    await load();
  };

  // Rejoue un paiement mis en file d'attente hors-ligne.
  const enregistrerPaiementDepuisFile = async ({ factureUuid, montant, mode, date, nouveauRegle, nouveauStatut }) => {
    const { error } = await supabase.from("factures").update({ montant_regle: nouveauRegle, statut: nouveauStatut }).eq("id", factureUuid);
    if (error) return { error };
    return supabase.from("paiements").insert({ facture_id: factureUuid, montant: Number(montant), mode, date, created_by: userId });
  };

  // Ne peut réussir que si la facture est déjà "Payée" — la contrainte
  // "projet_termine_requiert_paiement" (migration 0006) le garantit aussi
  // côté base, même si l'interface était contournée.
  const marquerProjetTermine = async (facture) => {
    const { error } = await supabase.from("factures")
      .update({ projet_termine: true, termine_le: todayISO() })
      .eq("id", facture.uuid);
    if (!error) await load();
    return { error };
  };

  // La suppression est déjà restreinte côté serveur aux Administrateurs par la
  // policy RLS "factures: suppression admin" — un autre rôle recevrait une erreur.
  const deleteFacture = async (facture) => {
    const { error } = await supabase.from("factures").delete().eq("id", facture.uuid);
    if (!error) await load();
    return { error };
  };

  // Rattache (ou détache si projetId est null) une facture existante à un
  // projet, utilisé depuis l'écran Projets pour relier rétroactivement une
  // ancienne facture.
  const lierProjet = async (facture, projetId) => {
    const { error } = await supabase.from("factures").update({ projet_id: projetId }).eq("id", facture.uuid);
    if (!error) await load();
    return { error };
  };

  return { factures, createFacture, creerDepuisDevis, enregistrerPaiement, enregistrerPaiementDepuisFile, marquerProjetTermine, lierProjet, deleteFacture, loading, reload: load };
}
