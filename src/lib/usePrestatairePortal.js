import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const mapPrestataire = (row) => ({
  id: row.id,
  nom: row.nom,
  societe: row.societe || "",
  email: row.email || "",
  tel: row.telephone || "",
  notes: row.notes || "",
  typeProjet: row.type_projet,
  typeContrat: row.type_contrat,
});

const mapLien = (row) => ({
  id: row.id,
  projetId: row.projet_id,
  mission: row.mission || "",
});

const mapProjet = (row) => ({
  id: row.id,
  nom: row.nom,
  description: row.description || "",
  statut: row.statut,
  createdAt: row.created_at,
});

const mapContrat = (row) => ({
  id: row.id,
  titre: row.titre,
  typeService: row.type_service,
  statut: row.statut,
  contenu: row.contenu_final,
  envoyeLe: row.envoye_le,
  signeLe: row.signe_le,
});

const mapTache = (row) => ({
  id: row.id,
  projetId: row.projet_id,
  prestataireId: row.prestataire_id,
  parentTaskId: row.parent_task_id,
  titre: row.titre,
  description: row.description || "",
  statut: row.statut,
  echeance: row.echeance,
});

const mapFichier = (row) => ({
  id: row.id,
  projetId: row.projet_id,
  nom: row.nom,
  categorie: row.categorie || "Autre",
  mimeType: row.mime_type || "",
  tailleOctets: Number(row.taille_octets || 0),
  storagePath: row.storage_path,
  createdAt: row.created_at,
});

/**
 * Hook dédié au portail prestataire : le RLS limite automatiquement chaque
 * requête aux lignes du prestataire connecté (current_prestataire_id()).
 */
export function usePrestatairePortal(entrepriseId, userId) {
  const [prestataire, setPrestataire] = useState(null);
  const [liens, setLiens] = useState([]);
  const [projets, setProjets] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [taches, setTaches] = useState([]);
  const [fichiers, setFichiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId || !userId) return;
    const [prestataireRes, lienRes, projetRes, contratRes, tacheRes, fichierRes] = await Promise.all([
      supabase.from("prestataires").select("id, nom, societe, email, telephone, notes, type_projet, type_contrat").eq("user_id", userId).maybeSingle(),
      supabase.from("projet_prestataires").select("id, projet_id, mission"),
      supabase.from("projets").select("id, nom, description, statut, created_at"),
      supabase.from("contracts").select("id, titre, type_service, statut, contenu_final, envoye_le, signe_le").neq("statut", "Brouillon"),
      supabase.from("taches").select("id, projet_id, prestataire_id, parent_task_id, titre, description, statut, echeance").eq("entreprise_id", entrepriseId).order("echeance", { ascending: true }),
      supabase.from("fichiers_projets").select("id, projet_id, nom, categorie, mime_type, taille_octets, storage_path, created_at").order("created_at", { ascending: false }),
    ]);
    if (!prestataireRes.error) setPrestataire(prestataireRes.data ? mapPrestataire(prestataireRes.data) : null);
    if (!lienRes.error) setLiens((lienRes.data || []).map(mapLien));
    if (!projetRes.error) setProjets((projetRes.data || []).map(mapProjet));
    if (!contratRes.error) setContrats((contratRes.data || []).map(mapContrat));
    if (!tacheRes.error) setTaches((tacheRes.data || []).map(mapTache));
    if (!fichierRes.error) setFichiers((fichierRes.data || []).map(mapFichier));
    setLoading(false);
  }, [entrepriseId, userId]);

  useEffect(() => { load(); }, [load]);

  const saveTache = async (form) => {
    const row = {
      entreprise_id: entrepriseId,
      projet_id: form.projetId,
      prestataire_id: form.prestataireId,
      titre: form.titre.trim(),
      description: (form.description || "").trim(),
      statut: form.statut || "À faire",
      echeance: form.echeance || null,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("taches").update(row).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("taches").insert({ ...row, created_by: userId }));
    }
    if (!error) await load();
    return { error };
  };

  const notifierAdmins = async (type, titre, message) => {
    const { data: adminIds } = await supabase.rpc("get_admin_user_ids", { p_entreprise_id: entrepriseId });
    if (!adminIds) return;
    for (const adminId of adminIds) {
      await supabase.rpc("notify_evenement", {
        p_destinataire_user_id: adminId,
        p_entreprise_id: entrepriseId,
        p_type: type,
        p_titre: titre,
        p_message: message,
      });
    }
  };

  const changerStatutTache = async (tache, statut) => {
    const { error } = await supabase.from("taches")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", tache.id);
    if (!error) {
      await load();
      if (statut === "Bloquée") {
        await notifierAdmins("tache_bloquee", "Tâche bloquée", `« ${tache.titre} » a été marquée comme bloquée.`);
      } else if (statut === "Terminée") {
        await notifierAdmins("tache_terminee", "Tâche terminée", `« ${tache.titre} » a été terminée.`);
      }
    }
    return { error };
  };

  const changerStatutSousTache = async (sousTache, statut) => {
    const { error } = await supabase.from("taches")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", sousTache.id);
    if (!error) {
      await load();
      if (statut === "Bloquée") {
        await notifierAdmins("tache_bloquee", "Sous-tâche bloquée", `« ${sousTache.titre} » a été marquée comme bloquée.`);
      } else if (statut === "Terminée") {
        await notifierAdmins("tache_terminee", "Sous-tâche terminée", `« ${sousTache.titre} » a été terminée.`);
      }
    }
    return { error };
  };

  const addSousTache = async (parentId, titre, echeance, statut) => {
    const parent = taches.find((t) => t.id === parentId);
    if (!parent || !prestataire?.id) {
      return { error: new Error("Tâche parente ou fiche prestataire introuvable.") };
    }
    const { error } = await supabase.from("taches").insert({
      entreprise_id: entrepriseId,
      projet_id: parent.projetId,
      prestataire_id: prestataire.id,
      parent_task_id: parentId,
      titre: titre.trim(),
      description: "",
      statut: statut || "À faire",
      echeance: echeance || null,
      created_by: userId,
    });
    if (!error) await load();
    return { error };
  };

  const deleteSousTache = async (id) => {
    const { error } = await supabase.from("taches").delete().eq("id", id);
    if (!error) await load();
    return { error };
  };

  return { prestataire, liens, projets, contrats, taches, fichiers, loading, saveTache, changerStatutTache, changerStatutSousTache, addSousTache, deleteSousTache, reload: load };
}
