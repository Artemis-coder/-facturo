import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

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

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase
      .from("depenses")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .order("date", { ascending: false });
    if (!error) setDepenses(data.map(mapRow));
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
