import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { SITE_URL } from "./siteUrl";

const PRESTATAIRE_SELECT = "id, nom, societe, email, telephone, notes, type_projet, type_contrat, user_id, created_by, created_at, updated_at";
const LIEN_SELECT = "id, projet_id, prestataire_id, mission, created_by, created_at";
const TACHE_SELECT = "id, projet_id, prestataire_id, titre, description, statut, echeance, created_by, created_at, updated_at";

const mapPrestataire = (row) => ({
  id: row.id,
  nom: row.nom,
  societe: row.societe || "",
  email: row.email || "",
  tel: row.telephone || "",
  notes: row.notes || "",
  typeProjet: row.type_projet,
  typeContrat: row.type_contrat,
  userId: row.user_id || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapLien = (row) => ({
  id: row.id,
  projetId: row.projet_id,
  prestataireId: row.prestataire_id,
  mission: row.mission || "",
  createdAt: row.created_at,
});

const mapTache = (row) => ({
  id: row.id,
  projetId: row.projet_id,
  prestataireId: row.prestataire_id,
  titre: row.titre,
  description: row.description || "",
  statut: row.statut,
  echeance: row.echeance,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function usePrestataires(entrepriseId, userId) {
  const [prestataires, setPrestataires] = useState([]);
  const [liens, setLiens] = useState([]);
  const [taches, setTaches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const [prestataireRes, lienRes, tacheRes] = await Promise.all([
      supabase.from("prestataires").select(PRESTATAIRE_SELECT).eq("entreprise_id", entrepriseId).order("created_at", { ascending: false }),
      supabase.from("projet_prestataires").select(LIEN_SELECT).eq("entreprise_id", entrepriseId).order("created_at", { ascending: false }),
      supabase.from("taches").select(TACHE_SELECT).eq("entreprise_id", entrepriseId).order("echeance", { ascending: true }),
    ]);
    if (!prestataireRes.error) setPrestataires((prestataireRes.data || []).map(mapPrestataire));
    if (!lienRes.error) setLiens((lienRes.data || []).map(mapLien));
    if (!tacheRes.error) setTaches((tacheRes.data || []).map(mapTache));
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const savePrestataire = async (form) => {
    const row = {
      entreprise_id: entrepriseId,
      nom: form.nom.trim(),
      societe: (form.societe || "").trim(),
      email: form.email || null,
      telephone: form.tel || null,
      notes: form.notes || null,
      type_projet: form.typeProjet,
      type_contrat: form.typeContrat,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("prestataires").update(row).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("prestataires").insert({ ...row, created_by: userId }));
    }
    if (!error) await load();
    return { error };
  };

  const deletePrestataire = async (id) => {
    const { error } = await supabase.from("prestataires").delete().eq("id", id);
    if (!error) await load();
    return { error };
  };

  const affecterPrestataire = async ({ projetId, prestataireId, mission }) => {
    const { error } = await supabase.from("projet_prestataires").insert({
      entreprise_id: entrepriseId,
      projet_id: projetId,
      prestataire_id: prestataireId,
      mission: mission || "",
      created_by: userId,
    });
    if (error?.code === "23505") {
      return { error: new Error("Ce prestataire est déjà affecté à ce projet.") };
    }
    if (!error) await load();
    return { error };
  };

  const detacherPrestataire = async (linkId) => {
    const { error } = await supabase.from("projet_prestataires").delete().eq("id", linkId);
    if (!error) await load();
    return { error };
  };

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

  const deleteTache = async (id) => {
    const { error } = await supabase.from("taches").delete().eq("id", id);
    if (!error) await load();
    return { error };
  };

  const inviterPrestataire = async (prestataire) => {
    const { error: insertError } = await supabase.from("invitations").insert({
      entreprise_id: entrepriseId,
      email: prestataire.email.trim(),
      role: "prestataire",
      prestataire_id: prestataire.id,
      invited_by: userId,
    });
    if (insertError) {
      await load();
      return { error: insertError };
    }
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: prestataire.email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: SITE_URL },
    });
    await load();
    return { error: null, emailError: otpError };
  };

  return { prestataires, liens, taches, loading, savePrestataire, deletePrestataire, affecterPrestataire, detacherPrestataire, saveTache, deleteTache, inviterPrestataire, reload: load };
}
