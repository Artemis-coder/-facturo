import React, { useState } from "react";
import { Download, FileText, Image, Paperclip } from "lucide-react";
import { T } from "../lib/theme";
import { downloadContractDocument } from "../lib/contractPdf";
import { telechargerChatAttachment } from "../lib/fichierUtils";

export function FileAttachment({ attachment, onDownload }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (onDownload) {
      setDownloading(true);
      try {
        await onDownload(attachment);
      } finally {
        setDownloading(false);
      }
      return;
    }

    setDownloading(true);
    try {
      if (attachment.filePath) {
        await telechargerChatAttachment(attachment.filePath, attachment.fileName);
      } else if (attachment.contractId) {
        await downloadContractDocument(
          attachment.contractId,
          "transmitted",
          attachment.fileName || "fichier.pdf"
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  const fileSize = attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} Ko` : "";
  const isImage = attachment.mimeType?.startsWith("image/");
  const isPdf = attachment.mimeType === "application/pdf";

  const Icon = isImage ? Image : isPdf ? FileText : Paperclip;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${T.line}`,
        background: T.bg,
        marginTop: 8,
        maxWidth: 320,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: T.paper,
          color: T.inkSoft,
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: T.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {attachment.fileName || "Fichier joint"}
        </div>
        {fileSize && (
          <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 2 }}>{fileSize}</div>
        )}
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 12px",
          borderRadius: 8,
          border: `1px solid ${T.line}`,
          background: T.paper,
          color: T.ink,
          cursor: downloading ? "not-allowed" : "pointer",
          fontSize: 12,
          fontWeight: 600,
          opacity: downloading ? 0.7 : 1,
        }}
      >
        <Download size={13} />
        {downloading ? "..." : "Télécharger"}
      </button>
    </div>
  );
}
