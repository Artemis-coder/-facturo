import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { cacheGet, cacheSet, enqueueAction } from "./offline";

export function useClients(entrepriseId) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const cacheKey = `clients:${entrepriseId}`;

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    try {
      const { data, error } = await supabase.from("clients").select("*").eq("entreprise_id", entrepriseId).order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = data.map((c) => ({
        id: c.id, nom: c.nom, societe: c.societe, email: c.email,
        tel: c.telephone, ville: c.ville, notes: c.notes, statut: c.statut || "Prospect",
      }));
      setClients(mapped); cacheSet(cacheKey, mapped);
    } catch {
      const cached = cacheGet(cacheKey);
      if (cached) setClients(cached); // hors ligne : dernières données connues
    }
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const saveClient = async (form) => {
    const row = {
      entreprise_id: entrepriseId, nom: form.nom, societe: form.societe,
      email: form.email, telephone: form.tel, ville: form.ville, notes: form.notes,
      statut: form.statut || "Prospect",
    };
    if (!navigator.onLine && !form.id) {
      enqueueAction("saveClient", row, `Nouveau client : ${form.nom}`);
      const next = [{ ...form, id: "local-" + Date.now() }, ...clients];
      setClients(next); cacheSet(cacheKey, next);
      return { error: null, queued: true };
    }
    let error;
    if (form.id) {
      ({ error } = await supabase.from("clients").update(row).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("clients").insert(row));
    }
    if (!error) await load();
    return { error };
  };

  return { clients, saveClient, loading, reload: load };
}
