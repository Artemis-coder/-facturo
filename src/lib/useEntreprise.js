import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

function mapRow(e) {
  return {
    id: e.id,
    nom: e.nom || "",
    tel: e.telephone || "",
    rccm: e.rccm || "",
    nif: e.nif || "",
    adresse: e.adresse || "",
    devise: e.devise || "FCFA (XOF)",
    langue: e.langue || "Français",
    conditions: e.conditions_generales || "",
    tvaDefaut: e.tva_defaut ?? 18,
    prefixeFacture: e.prefixe_facture || "F-",
    prefixeDevis: e.prefixe_devis || "D-",
    prochainNumero: e.prochain_numero ?? 1,
    notifPaiement: e.preferences?.notifPaiement ?? true,
    notifEcheance: e.preferences?.notifEcheance ?? true,
    relanceAuto: e.preferences?.relanceAuto ?? false,
  };
}

export function useEntreprise(entrepriseId) {
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase.from("entreprises").select("*").eq("id", entrepriseId).single();
    if (!error) setEntreprise(mapRow(data));
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const saveProfil = async (form) => {
    await supabase.from("entreprises").update({
      nom: form.nom, telephone: form.tel, rccm: form.rccm, nif: form.nif,
      adresse: form.adresse, devise: form.devise, langue: form.langue,
      conditions_generales: form.conditions,
    }).eq("id", entrepriseId);
    await load();
  };

  const saveParametres = async (form) => {
    await supabase.from("entreprises").update({
      tva_defaut: Number(form.tvaDefaut),
      prefixe_facture: form.prefixeFacture,
      prefixe_devis: form.prefixeDevis,
      prochain_numero: Number(form.prochainNumero),
      preferences: {
        notifPaiement: form.notifPaiement,
        notifEcheance: form.notifEcheance,
        relanceAuto: form.relanceAuto,
      },
    }).eq("id", entrepriseId);
    await load();
  };

  return { entreprise, saveProfil, saveParametres, loading, reload: load };
}
