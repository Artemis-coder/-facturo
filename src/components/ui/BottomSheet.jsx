import React, { useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import { T } from "../../lib/theme";

export function BottomSheet({ open, onClose, title, children, maxHeight = "92dvh", zIndex = 210 }) {
  const panelRef = useRef(null);
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.maxHeight = "92vh";
    el.style.maxHeight = maxHeight;
  }, [open, maxHeight]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#16213A66", zIndex, animation: "fadeIn .2s ease" }}>
      <div ref={panelRef} onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: T.paper, borderRadius: "18px 18px 0 0",
        border: `1px solid ${T.line}`, borderBottom: "none",
        boxShadow: "0 -12px 32px rgba(22,33,58,.2)",
        animation: "sheetIn .24s cubic-bezier(.2,.8,.3,1)",
        paddingBottom: "env(safe-area-inset-bottom)",
        fontFamily: "'IBM Plex Sans', sans-serif",
        display: "flex", flexDirection: "column",
        maxHeight: "92vh",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T.line, margin: "10px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 20px 6px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink, minWidth: 0 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, padding: 6, display: "flex", flexShrink: 0 }}><X size={18} /></button>
        </div>
        <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "env(safe-area-inset-bottom)" }}>{children}</div>
      </div>
    </div>
  );
}
