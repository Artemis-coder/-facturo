import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    "Facturo: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants. " +
    "En local : copiez .env.example vers .env. " +
    "Sur Vercel : Project Settings → Environment Variables, puis redeploy."
  );
}

// On exporte toujours un client, même factice, pour que le reste du code
// (qui importe { supabase } sans savoir s'il est configuré) ne plante pas
// au chargement du module — c'est CE crash qui produisait la page blanche.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-anon-key");
