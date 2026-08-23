import { supabase } from "./supabaseClient";

export const FICHIER_BUCKET = "fichiers-projets";

export function formatTaille(octets) {
  if (octets === null || octets === undefined) return "";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1).replace(".", ",")} Ko`;
  if (octets < 1024 * 1024 * 1024) return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  return `${(octets / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} Go`;
}

export function estApercable(fichier) {
  const mime = (fichier.mimeType || "").toLowerCase();
  return mime.startsWith("image/") || mime === "application/pdf";
}

const triggerDownload = (blob, nom) => {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
};

export async function urlSigneeFichier(fichier, { download = false, expireSecondes = 300 } = {}) {
  const options = download ? { download: fichier.nom } : undefined;
  const { data, error } = await supabase.storage
    .from(FICHIER_BUCKET)
    .createSignedUrl(fichier.storagePath, expireSecondes, options);
  return { error, url: error || !data ? null : data.signedUrl };
}

export async function telechargerFichier(fichier) {
  const { url, error } = await urlSigneeFichier(fichier, { download: true });
  if (error || !url) return { error };
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("impossible de récupérer le fichier.");
    const blob = await res.blob();
    triggerDownload(blob, fichier.nom);
    return { error: null };
  } catch (e) {
    return { error: e };
  }
}

export async function telechargerChatAttachment(filePath, fileName) {
  if (!filePath) return { error: new Error("Chemin de fichier introuvable.") };
  const { data, error } = await supabase.storage
    .from("chat-attachments")
    .createSignedUrl(filePath, 300, { download: fileName });
  if (error || !data?.signedUrl) return { error: error || new Error("Impossible de générer le lien de téléchargement.") };
  try {
    const res = await fetch(data.signedUrl);
    if (!res.ok) throw new Error("impossible de récupérer le fichier.");
    const blob = await res.blob();
    triggerDownload(blob, fileName || "fichier.pdf");
    return { error: null };
  } catch (e) {
    return { error: e };
  }
}
