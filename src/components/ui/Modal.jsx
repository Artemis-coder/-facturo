import React from "react";
import { X } from "lucide-react";
import { T } from "../../lib/theme";

export function Modal({ title, onClose, children, wide, extraWide }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#16213A5C", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", top: 0, right: 0, height: "100%",
        width: extraWide ? 1160 : (wide ? 600 : 420), maxWidth: "96vw",
        background: T.paper, borderLeft: `1px solid ${T.line}`,
        borderRadius: "18px 0 0 18px", overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "-10px 0 28px rgba(22,33,58,.16)",
        animation: "drawerIn .24s cubic-bezier(.2,.8,.3,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16.5 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, padding: 4, display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
