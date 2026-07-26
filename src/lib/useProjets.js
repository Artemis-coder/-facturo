import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

function mapRow(p) {
  return {
    id: p.id,
    nom: p.nom,
    description: p.description || "",
    clientId: p.client_id,
    statut: p.statut,
    termineLe: p.termine_le,
    date: p.created_at ? p.created_at.slice(0, 10) : null,
  };
}

export function useProjets(entrepriseId) {
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase
      .from("projets")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .order("created_at", { ascending: false });
    if (!error) setProjets(data.map(mapRow));
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const saveProjet = async (form) => {
    const row = {
      entreprise_id: entrepriseId, nom: form.nom, description: form.description,
      client_id: form.clientId || null,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("projets").update(row).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("projets").insert(row));
    }
    if (!error) await load();
    return { error };
  };

  const changerStatut = async (projetId, statut) => {
    const patch = { statut };
    if (statut === "Terminé") patch.termine_le = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("projets").update(patch).eq("id", projetId);
    if (!error) await load();
    return { error };
  };

  const deleteProjet = async (projetId) => {
    const { error } = await supabase.from("projets").delete().eq("id", projetId);
    if (!error) await load();
    return { error };
  };

  return { projets, saveProjet, changerStatut, deleteProjet, loading, reload: load };
}
