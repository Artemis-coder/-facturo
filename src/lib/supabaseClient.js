import { createClient } from "@supabase/supabase-js";

// .trim() défend contre un espace ou un retour à la ligne collé par erreur
// dans les variables d'environnement (Vercel notamment) — une cause fréquente
// de "Failed to fetch" qui n'est pas visible à l'oeil nu.
const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    "Facturo: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants. " +
    "En local : copiez .env.example vers .env. " +
    "Sur Vercel : Project Settings → Environment Variables, puis redeploy."
  );
} else {
  // Diagnostic sans exposer la clé : utile pour vérifier dans la console du
  // navigateur que l'URL utilisée est bien la bonne, sans révéler le secret.
  // eslint-disable-next-line no-console
  console.info("Facturo: connexion Supabase configurée vers", url);
}

// On exporte toujours un client, même factice, pour que le reste du code
// (qui importe { supabase } sans savoir s'il est configuré) ne plante pas
// au chargement du module — c'est CE crash qui produisait la page blanche.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-anon-key");
