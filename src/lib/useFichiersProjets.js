import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { FICHIER_BUCKET } from "./fichierUtils";

const FICHIER_SELECT =
  "id, projet_id, nom, categorie, mime_type, taille_octets, storage_path, created_by, created_at";

export const FICHIER_CATEGORIES = [
  "Design graphique",
  "Développement web",
  "Audiovisuel",
  "Marketing",
  "Rédaction",
  "Autre",
];

const MAX_TAILLE = 50 * 1024 * 1024;

const mapFichier = (row) => ({
  id: row.id,
  projetId: row.projet_id,
  nom: row.nom,
  categorie: row.categorie || "Autre",
  mimeType: row.mime_type || "",
  tailleOctets: Number(row.taille_octets || 0),
  storagePath: row.storage_path,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

export function useFichiersProjets(entrepriseId, userId) {
  const [fichiers, setFichiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const { data, error } = await supabase
      .from("fichiers_projets")
      .select(FICHIER_SELECT)
      .eq("entreprise_id", entrepriseId)
      .order("created_at", { ascending: false });
    if (!error) setFichiers((data || []).map(mapFichier));
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const notifierPrestataires = async (projetId, nomFichier) => {
    const { data: liens } = await supabase
      .from("projet_prestataires")
      .select("prestataire_id")
      .eq("projet_id", projetId);
    if (!liens || liens.length === 0) return;
    const { data: prests } = await supabase
      .from("prestataires")
      .select("id, user_id")
      .in("id", liens.map((l) => l.prestataire_id));
    for (const p of prests || []) {
      if (!p.user_id) continue;
      await supabase.rpc("notify_evenement", {
        p_destinataire_user_id: p.user_id,
        p_entreprise_id: entrepriseId,
        p_type: "fichier_disponible",
        p_titre: "Nouveau fichier disponible",
        p_message: `« ${nomFichier} » a été mis à votre disposition. Retrouvez-le dans « Mes fichiers ».`,
      });
    }
  };

  const uploadFichier = async ({ projetId, file, categorie }) => {
    if (file.size > MAX_TAILLE) {
      return { error: new Error("Le fichier ne peut pas dépasser 50 Mo.") };
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${entrepriseId}/${projetId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upError } = await supabase.storage
      .from(FICHIER_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
    if (upError) return { error: upError };
    const { data: inserted, error: insError } = await supabase
      .from("fichiers_projets")
      .insert({
        entreprise_id: entrepriseId,
        projet_id: projetId,
        nom: file.name,
        categorie: categorie || "Autre",
        mime_type: file.type || "",
        taille_octets: file.size,
        storage_path: path,
        created_by: userId || null,
      })
      .select(FICHIER_SELECT)
      .single();
    if (insError) {
      await supabase.storage.from(FICHIER_BUCKET).remove([path]);
      return { error: insError };
    }
    await notifierPrestataires(projetId, inserted.nom);
    await load();
    return { error: null, fichier: mapFichier(inserted) };
  };

  const supprimerFichier = async (fichier) => {
    const { error: delError } = await supabase.from("fichiers_projets").delete().eq("id", fichier.id);
    if (!delError) {
      await supabase.storage.from(FICHIER_BUCKET).remove([fichier.storagePath]);
      await load();
    }
    return { error: delError };
  };

  return { fichiers, loading, uploadFichier, supprimerFichier, reload: load };
}
