import React from "react";
import { T } from "../../lib/theme";

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 5, fontWeight: 600, letterSpacing: 0.3 }}>{label}</div>
      {children}
    </label>
  );
}
