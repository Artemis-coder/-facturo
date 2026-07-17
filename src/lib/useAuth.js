import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

/**
 * useAuth
 * -------
 * Wraps Supabase Auth + the linked `profiles` row (role, entreprise_id).
 * The profile row is created automatically by the `handle_new_user` trigger
 * (see supabase/migrations/0001_init_schema_roles_rls.sql) the moment a
 * new account is created via signUp().
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, entreprise_id, nom_complet, email, role, entreprises(*)")
      .eq("id", userId)
      .single();
    if (!error) setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfile(session?.user?.id).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      loadProfile(session?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  // entrepriseNom / nomComplet are passed to the `handle_new_user` trigger via
  // raw_user_meta_data — they seed the new entreprise + profile rows.
  const signUp = async (email, password, entrepriseNom, nomComplet) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { entreprise_nom: entrepriseNom, nom_complet: nomComplet } },
    });
    return { error };
  };

  const signOut = () => supabase.auth.signOut();

  return { session, profile, loading, signIn, signUp, signOut, refreshProfile: () => loadProfile(session?.user?.id) };
}
