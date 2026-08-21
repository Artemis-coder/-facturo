import React, { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { T } from "../lib/theme";
import { useNotifications } from "../lib/useNotifications";

const formatDateNotif = (iso) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function NotifsBell({ userId, entrepriseId }) {
  const { notifications, nonLues, toutMarquerLues, marquerLues } = useNotifications(userId, entrepriseId);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nonLues > 0 ? T.gold : T.inkSoft, flexShrink: 0, position: "relative" }}
      >
        <Bell size={16} />
        {nonLues > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, background: T.brick, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: 42, right: 0, width: 340, maxWidth: "calc(100vw - 60px)", background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(22,33,58,.16)", zIndex: 201, overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${T.line}`, background: T.bg }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, fontWeight: 600 }}>Notifications</span>
              <div style={{ display: "flex", gap: 6 }}>
                {nonLues > 0 && (
                  <button onClick={toutMarquerLues} title="Tout marquer lu" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: T.inkSoft, cursor: "pointer" }}>
                    <Check size={12} /> Tout lire
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, display: "flex" }}><X size={15} /></button>
              </div>
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {notifications.length === 0 && (
                <div style={{ padding: "26px 14px", textAlign: "center", fontSize: 12.5, color: T.inkSoft }}>Aucune notification pour le moment.</div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.lu) marquerLues([n.id]); }}
                  style={{ padding: "11px 14px", borderBottom: `1px dashed ${T.line}`, cursor: n.lu ? "default" : "pointer", background: n.lu ? "#fff" : T.goldSoft + "66" }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    {!n.lu && <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.gold, marginTop: 5, flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 2 }}>{n.titre}</div>
                      <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>{formatDateNotif(n.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
