import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// Chaque règlement de facture (total ou partiel) constitue une "entrée" de
// trésorerie. On lit directement la table `paiements` (déjà alimentée par
// enregistrerPaiement dans useFactures) plutôt que de la recalculer, pour que
// le Journal de trésorerie soit toujours exact au FCFA près et daté au jour
// réel du règlement.
export function usePaiements(entrepriseId) {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase
      .from("paiements")
      .select("id, montant, mode, date, facture_id, factures!inner(numero, client_id, entreprise_id)")
      .eq("factures.entreprise_id", entrepriseId)
      .order("date", { ascending: false });
    if (!error) {
      setPaiements(data.map((p) => ({
        id: p.id,
        montant: Number(p.montant),
        mode: p.mode,
        date: p.date,
        factureId: p.facture_id,
        factureNumero: p.factures?.numero,
        clientId: p.factures?.client_id,
      })));
    }
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  return { paiements, loading, reload: load };
}
