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
    prochainNumeroDevis: e.prochain_numero_devis ?? 1,
    prochainNumeroFacture: e.prochain_numero_facture ?? 1,
    notifPaiement: e.preferences?.notifPaiement ?? true,
    notifEcheance: e.preferences?.notifEcheance ?? true,
    relanceAuto: e.preferences?.relanceAuto ?? false,
  };
}

export function useEntreprise(entrepriseId) {
  const [entreprise, setEntreprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase.from("entreprises").select("*").eq("id", entrepriseId).single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Facturo: échec du chargement de l'entreprise —", error.message);
      setLoadError(error.message);
    } else {
      setEntreprise(mapRow(data));
      setLoadError(null);
    }
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  // Les deux fonctions ci-dessous renvoient toujours { error }, jamais rien
  // qui laisse croire silencieusement à un succès — c'est ce qui manquait
  // et qui faisait passer un échec d'enregistrement (ex. TVA) pour une réussite.
  const saveProfil = async (form) => {
    const { error } = await supabase.from("entreprises").update({
      nom: form.nom, telephone: form.tel, rccm: form.rccm, nif: form.nif,
      adresse: form.adresse, devise: form.devise, langue: form.langue,
      conditions_generales: form.conditions,
    }).eq("id", entrepriseId);
    if (error) { console.error("Facturo: échec saveProfil —", error.message); return { error }; }
    await load();
    return { error: null };
  };

  const saveParametres = async (form) => {
    const { error } = await supabase.from("entreprises").update({
      tva_defaut: Number(form.tvaDefaut),
      prefixe_facture: form.prefixeFacture,
      prefixe_devis: form.prefixeDevis,
      prochain_numero_devis: Number(form.prochainNumeroDevis),
      prochain_numero_facture: Number(form.prochainNumeroFacture),
      preferences: {
        notifPaiement: form.notifPaiement,
        notifEcheance: form.notifEcheance,
        relanceAuto: form.relanceAuto,
      },
    }).eq("id", entrepriseId);
    if (error) { console.error("Facturo: échec saveParametres —", error.message); return { error }; }
    await load();
    return { error: null };
  };

  return { entreprise, saveProfil, saveParametres, loading, loadError, reload: load };
}
