import React from "react";
import { T } from "../../lib/theme";

export function Card({ children, style }) {
  return (
    <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(22,33,58,.04)", ...style }}>
      {children}
    </div>
  );
}
