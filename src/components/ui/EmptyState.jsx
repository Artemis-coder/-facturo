import React from "react";
import { T } from "../../lib/theme";

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: T.inkSoft }}>
      {Icon && (
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <Icon size={20} style={{ color: T.inkSoft }} />
        </div>
      )}
      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, marginBottom: subtitle ? 4 : 0 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12.5 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
