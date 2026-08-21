import React from "react";
import { CheckCircle2 } from "lucide-react";
import { T } from "../../lib/theme";

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="app-toast" style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: T.ink, color: "#fff", padding: "11px 20px", borderRadius: 30,
      fontSize: 13, display: "flex", alignItems: "center", gap: 8, zIndex: 100,
      boxShadow: "0 6px 20px rgba(22,33,58,.25)", maxWidth: "calc(100vw - 24px)", textAlign: "center",
    }}>
      <CheckCircle2 size={15} color={T.gold} />{message}
    </div>
  );
}
