import React, { useEffect, useState } from "react";
import {
  Download, File, FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet,
  FileText, FileVideo, ExternalLink,
} from "lucide-react";
import { T } from "../lib/theme";
import { Btn, Modal, Spinner } from "./ui";
import { urlSigneeFichier, telechargerFichier, formatTaille, estApercable } from "../lib/fichierUtils";

export function IconeFichier({ mimeType, size = 15, style }) {
  const mime = (mimeType || "").toLowerCase();
  const props = { size, color: T.inkSoft, style: { flexShrink: 0, ...style } };
  if (mime.startsWith("image/")) return <FileImage {...props} />;
  if (mime.startsWith("video/")) return <FileVideo {...props} />;
  if (mime.startsWith("audio/")) return <FileAudio {...props} />;
  if (mime === "application/pdf") return <FileText {...props} />;
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("rar") || mime.includes("7z")) return <FileArchive {...props} />;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return <FileSpreadsheet {...props} />;
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("html") || mime.includes("xml")) return <FileCode {...props} />;
  return <File {...props} />;
}

export function CategorieBadge({ categorie }) {
  return (
    <span style={{
      background: T.goldSoft, color: T.gold, fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", padding: "3px 8px",
      borderRadius: 20, border: `1px solid ${T.gold}33`, whiteSpace: "nowrap", fontWeight: 600,
    }}>{categorie || "Autre"}</span>
  );
}

export function FichierApercu({ fichier, onClose, notify }) {
  const [url, setUrl] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;
    let blobUrl = null;
    if (!estApercable(fichier)) return;
    (async () => {
      const { url: signedUrl, error } = await urlSigneeFichier(fichier, { download: true });
      if (!actif) return;
      if (error || !signedUrl) {
        setErreur("Impossible de charger l'aperçu : " + (error?.message || "erreur réseau."));
        return;
      }
      try {
        const res = await fetch(signedUrl);
        if (!actif) return;
        const buf = await res.arrayBuffer();
        const safeType = (fichier.mimeType || "").split(";")[0].trim();
        blobUrl = URL.createObjectURL(new Blob([buf], { type: safeType || res.headers.get("content-type") || "" }));
        setUrl(blobUrl);
      } catch (e) {
        if (actif) setErreur("Impossible de charger l'aperçu : " + (e.message || "erreur réseau."));
      }
    })();
    return () => {
      actif = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fichier]);

  const mime = (fichier.mimeType || "").toLowerCase();
  const telecharger = async () => {
    const { error } = await telechargerFichier(fichier);
    if (error) notify?.("Échec du téléchargement : " + error.message);
  };

  return (
    <Modal title={fichier.nom} onClose={onClose} extraWide>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <IconeFichier mimeType={fichier.mimeType} />
        <span style={{ fontSize: 12, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{formatTaille(fichier.tailleOctets)}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {url && (
            <Btn variant="ghost" small icon={ExternalLink} onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Ouvrir dans un nouvel onglet</Btn>
          )}
          <Btn variant="gold" small icon={Download} onClick={telecharger}>Télécharger</Btn>
        </div>
      </div>

      {erreur && (
        <div style={{ textAlign: "center", padding: 40, background: T.bg, borderRadius: 10 }}>
          <FileImage size={22} color={T.inkSoft} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13, color: T.brick, marginBottom: 14 }}>{erreur}</div>
          <Btn icon={Download} onClick={telecharger}>Télécharger le fichier</Btn>
        </div>
      )}

      {!erreur && estApercable(fichier) && !url && (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>
      )}

      {!erreur && url && mime.startsWith("image/") && (
        <div style={{ background: T.bg, borderRadius: 10, padding: 16, textAlign: "center" }}>
          <img src={url} alt={fichier.nom} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 6 }} />
        </div>
      )}

      {!erreur && url && mime === "application/pdf" && (
        <iframe title={fichier.nom} src={url} style={{ width: "100%", height: "72vh", border: `1px solid ${T.line}`, borderRadius: 10, background: T.bg }} />
      )}

      {!erreur && !estApercable(fichier) && (
        <div style={{ textAlign: "center", padding: 46, background: T.bg, borderRadius: 10 }}>
          <IconeFichier mimeType={fichier.mimeType} size={24} style={{ margin: "0 auto 10px" }} />
          <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>Aperçu non disponible pour ce type de fichier. Vous pouvez le télécharger.</div>
          <Btn icon={Download} onClick={telecharger}>Télécharger</Btn>
        </div>
      )}
    </Modal>
  );
}
