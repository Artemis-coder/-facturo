import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { SITE_URL } from "./siteUrl";

export function useUsers(entrepriseId) {
  const [profiles, setProfiles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [invitationsAcceptees, setInvitationsAcceptees] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const [{ data: p }, { data: i }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("entreprise_id", entrepriseId).order("created_at"),
      supabase.from("invitations").select("*").eq("entreprise_id", entrepriseId).eq("accepted", false).order("created_at"),
      supabase.from("invitations").select("id", { count: "exact", head: true }).eq("entreprise_id", entrepriseId).eq("accepted", true),
    ]);
    setProfiles(p || []);
    setInvitations(i || []);
    setInvitationsAcceptees(count || 0);
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (profileId, role) => {
    await supabase.from("profiles").update({ role }).eq("id", profileId);
    await load();
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
  const resendInviteEmail = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: SITE_URL },
    });
    return { error };
  };

  const cancelInvitation = async (id) => {
    await supabase.from("invitations").delete().eq("id", id);
    await load();
  };

  return { profiles, invitations, invitationsAcceptees, changeRole, invite, resendInviteEmail, cancelInvitation, loading, reload: load };
}
