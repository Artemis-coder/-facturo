import React from "react";
import { T } from "../../lib/theme";

export function Badge({ statut }) {
  const map = {
    "Brouillon": { bg: T.slateSoft, fg: T.slate },
    "Envoyé": { bg: T.slateSoft, fg: T.slate },
    "Envoyée": { bg: T.slateSoft, fg: T.slate },
    "Accepté": { bg: T.tealSoft, fg: T.teal },
    "Payée": { bg: T.tealSoft, fg: T.teal },
    "Partiellement payée": { bg: T.goldSoft, fg: T.gold },
    "Refusé": { bg: T.brickSoft, fg: T.brick },
    "En retard": { bg: T.brickSoft, fg: T.brick },
    "Expiré": { bg: T.brickSoft, fg: T.brick },
    "Annulée": { bg: T.brickSoft, fg: T.brick },
  };
  const c = map[statut] || { bg: T.slateSoft, fg: T.slate };
  return (
    <span style={{
      background: c.bg, color: c.fg, fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", padding: "3px 8px",
      borderRadius: 20, border: `1px solid ${c.fg}33`, whiteSpace: "nowrap", fontWeight: 600,
    }}>{statut}</span>
  );
}
