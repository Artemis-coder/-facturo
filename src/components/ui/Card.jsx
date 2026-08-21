import React from "react";
import { T } from "../../lib/theme";

export function Card({ children, style, className, onClick }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(22,33,58,.04)", cursor: onClick ? "pointer" : undefined, ...style }}
    >
      {children}
    </div>
  );
}
