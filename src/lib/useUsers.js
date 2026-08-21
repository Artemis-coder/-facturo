import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { SITE_URL } from "./siteUrl";

export function useUsers(entrepriseId, userId) {
  const [profiles, setProfiles] = useState([]);
  const [prestataires, setPrestataires] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [invitationsAcceptees, setInvitationsAcceptees] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const [{ data: p }, { data: pr }, { data: i }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("entreprise_id", entrepriseId).order("created_at"),
      supabase.from("prestataires").select("id, nom, societe, email, telephone, notes, type_projet, type_contrat, user_id, created_at, updated_at, deleted_at, deleted_by").eq("entreprise_id", entrepriseId).order("created_at"),
      supabase.from("invitations").select("*").eq("entreprise_id", entrepriseId).eq("accepted", false).order("created_at"),
      supabase.from("invitations").select("id", { count: "exact", head: true }).eq("entreprise_id", entrepriseId).eq("accepted", true),
    ]);
    setProfiles(p || []);
    setPrestataires(pr || []);
    setInvitations(i || []);
    setInvitationsAcceptees(count || 0);
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (profileId, role) => {
    const { error } = await supabase.rpc("change_profile_role", { p_profile_id: profileId, p_new_role: role, p_by: userId });
    await load();
    return { error };
  };

  const invite = async (email, role) => {
    const { error: insertError } = await supabase.from("invitations").insert({ entreprise_id: entrepriseId, email, role });
    if (insertError) { await load(); return { error: insertError, emailSent: false }; }

    // Envoie un vrai e-mail (lien magique) via le SMTP configuré côté Supabase.
    // Si l'envoi échoue (ex. limite de fréquence), l'invitation reste créée :
    // l'admin peut réessayer avec "Renvoyer l'e-mail" ou partager le message manuellement.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: SITE_URL },
    });
    await load();
    return { error: null, emailError: otpError };
  };

  // Renvoie l'e-mail d'invitation (lien magique) pour une invitation déjà créée.
  const resendInviteEmail = async (invitation) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: invitation.email,
      options: { shouldCreateUser: true, emailRedirectTo: SITE_URL },
    });
    return { error };
  };

  const cancelInvitation = async (id) => {
    await supabase.from("invitations").delete().eq("id", id);
    await load();
  };

  // Suppression définitive pour utilisateur (admin seulement)
  const softDeleteUser = async (profileId) => {
    const { error } = await supabase.rpc('hard_delete_user', {
      p_profile_id: profileId,
      p_deleted_by: userId
    });
    if (error) throw error;
    await load();
  };

  // Suppression définitive pour prestataire (admin seulement)
  const softDeletePrestataire = async (prestataireId) => {
    const { error } = await supabase.rpc('hard_delete_prestataire', {
      p_prestataire_id: prestataireId,
      p_deleted_by: userId
    });
    if (error) throw error;
    await load();
  };

  // Trouver un prestataire par son user_id
  const getPrestataireByUserId = (userId) => {
    return prestataires.find(p => p.user_id === userId);
  };

  return {
    profiles,
    prestataires,
    invitations,
    invitationsAcceptees,
    loading,
    changeRole,
    invite,
    resendInviteEmail,
    cancelInvitation,
    softDeleteUser,
    softDeletePrestataire,
    getPrestataireByUserId,
    load
  };
}