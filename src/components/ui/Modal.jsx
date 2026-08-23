import React from "react";
import { X } from "lucide-react";
import { T, alpha } from "../../lib/theme";

export function Modal({ title, onClose, children, wide, extraWide }) {
  return (
    <div onClick={onClose} className="modal-overlay" style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-drawer" style={{
        position: "absolute", top: 0, right: 0, height: "100%",
        width: extraWide ? 1160 : (wide ? 600 : 420), maxWidth: "96vw",
        background: T.paper, borderLeft: `1px solid ${T.line}`,
        borderRadius: "18px 0 0 18px", overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: `-10px 0 28px ${alpha(T.sidebar, 16)}`,
        animation: "drawerIn .24s cubic-bezier(.2,.8,.3,1)",
      }}>
        <div className="modal-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "18px 22px", borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16.5, minWidth: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, padding: 8, display: "flex", borderRadius: 8, flexShrink: 0 }}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: 22, overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>{children}</div>
      </div>
    </div>
  );
}
