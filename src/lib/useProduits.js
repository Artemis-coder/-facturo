import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

export function useProduits(entrepriseId) {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase
      .from("produits")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .order("created_at", { ascending: false });
    if (!error) {
      setProduits(data.map((p) => ({
        id: p.id, nom: p.nom, categorie: p.categorie, prixHT: Number(p.prix_ht), tva: Number(p.tva),
      })));
    }
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const saveProduit = async (form) => {
    const row = {
      entreprise_id: entrepriseId, nom: form.nom, categorie: form.categorie,
      prix_ht: Number(form.prixHT), tva: Number(form.tva),
    };
    if (form.id) {
      await supabase.from("produits").update(row).eq("id", form.id);
    } else {
      await supabase.from("produits").insert(row);
    }
    await load();
  };

  return { produits, saveProduit, loading, reload: load };
}
