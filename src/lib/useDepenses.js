import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { cacheGet, cacheSet, enqueueAction } from "./offline";

function mapRow(d) {
  return {
    uuid: d.id,
    categorie: d.categorie,
    description: d.description || "",
    montant: Number(d.montant),
    date: d.date,
    mode: d.mode,
  };
}

export function useDepenses(entrepriseId) {
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const cacheKey = `depenses:${entrepriseId}`;

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    try {
      const { data, error } = await supabase.from("depenses").select("*").eq("entreprise_id", entrepriseId).order("date", { ascending: false });
      if (error) throw error;
      const mapped = data.map(mapRow);
      setDepenses(mapped); cacheSet(cacheKey, mapped);
    } catch {
      const cached = cacheGet(cacheKey);
      if (cached) setDepenses(cached);
    }
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const saveDepense = async (form, userId) => {
    const row = {
      entreprise_id: entrepriseId,
      categorie: form.categorie,
      description: form.description,
      montant: Number(form.montant),
      date: form.date,
      mode: form.mode,
      created_by: userId,
    };
    if (!navigator.onLine && !form.uuid) {
      enqueueAction("saveDepense", row, `Dépense : ${form.categorie} — ${form.montant} FCFA`);
      const next = [mapRow({ id: "local-" + Date.now(), ...row }), ...depenses];
      setDepenses(next); cacheSet(cacheKey, next);
      return { error: null, queued: true };
    }
    let error;
    if (form.uuid) {
      ({ error } = await supabase.from("depenses").update(row).eq("id", form.uuid));
    } else {
      ({ error } = await supabase.from("depenses").insert(row));
    }
    if (!error) await load();
    return { error };
  };

  const deleteDepense = async (depense) => {
    const { error } = await supabase.from("depenses").delete().eq("id", depense.uuid);
    if (!error) await load();
    return { error };
  };

  return { depenses, saveDepense, deleteDepense, loading, reload: load };
}
