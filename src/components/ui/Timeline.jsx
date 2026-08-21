import React from "react";
import { T } from "../../lib/theme";

// items: [{ title, date, detail }], plus récent en premier après tri par l'appelant
export function Timeline({ items }) {
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 8, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: i === 0 ? T.gold : T.line, flexShrink: 0 }} />
            {i < items.length - 1 && <div style={{ width: 1, flex: 1, background: T.line, marginTop: 2 }} />}
          </div>
          <div style={{ paddingBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{it.title} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400, color: T.inkSoft, fontSize: 11 }}>· {it.date}</span></div>
            {it.detail && <div style={{ fontSize: 12, color: T.inkSoft }}>{it.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
