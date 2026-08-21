import React, { useState } from "react";
import { Plus, X, Menu } from "lucide-react";
import { T } from "../lib/theme";

function TabItem({ tab, active, onSelect }) {
  const Icon = tab.icon;
  return (
    <button onClick={() => onSelect(tab.key)} style={{
      flex: 1, minWidth: 0, minHeight: 48, background: "none", border: "none", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
      color: active ? T.gold : T.inkSoft, padding: "6px 2px 8px",
    }}>
      <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
      <span style={{ fontSize: 10, fontWeight: active ? 700 : 600, letterSpacing: 0.2 }}>{tab.label}</span>
    </button>
  );
}

export function MobileTabBar({ tabs = [], quickActions = [], menuItems = [], view, setView, onQuickCreate, onOpenMenu }) {
  const canCreate = quickActions.length > 0;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuActive = !tabs.some((t) => t.key === view);

  const firstTabs = tabs.slice(0, 2);
  const lastTabs = tabs.slice(2);

  const launch = (kind) => { setSheetOpen(false); onQuickCreate(kind); };
  const openMenu = () => { setMenuOpen(true); onOpenMenu?.(); };

  return (
    <>
      <nav className="mobile-tabbar" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 90,
        background: `rgba(255,255,255,.96)`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.line}`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <div style={{ display: "flex", alignItems: "stretch", height: 60 }}>
          {firstTabs.map((t) => <TabItem key={t.key} tab={t} active={t.key === view} onSelect={setView} />)}
          {canCreate && (
            <div style={{ width: 72, position: "relative", flexShrink: 0 }}>
              <button onClick={() => setSheetOpen(true)} title="Créer" style={{
                position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)",
                width: 52, height: 52, borderRadius: "50%", border: "4px solid #fff",
                background: `linear-gradient(135deg, ${T.gold} 0%, #D49D43 100%)`, color: "#fff",
                boxShadow: "0 6px 16px rgba(201,138,43,.45)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Plus size={24} strokeWidth={2.2} />
              </button>
            </div>
          )}
          {lastTabs.map((t) => <TabItem key={t.key} tab={t} active={t.key === view} onSelect={setView} />)}
          <TabItem tab={{ key: "__menu__", label: "Menu", icon: Menu }} active={menuActive} onSelect={openMenu} />
        </div>
      </nav>

      {sheetOpen && (
        <div onClick={() => setSheetOpen(false)} style={{ position: "fixed", inset: 0, background: "#16213A66", zIndex: 200, animation: "fadeIn .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            background: T.paper, borderRadius: "18px 18px 0 0",
            border: `1px solid ${T.line}`, borderBottom: "none",
            boxShadow: "0 -12px 32px rgba(22,33,58,.2)",
            animation: "sheetIn .24s cubic-bezier(.2,.8,.3,1)",
            paddingBottom: "env(safe-area-inset-bottom)",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: T.line, margin: "10px auto 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px 6px" }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink }}>Créer</span>
              <button onClick={() => setSheetOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, padding: 6, display: "flex" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "8px 16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.kind} onClick={() => launch(a.kind)} style={{
                    display: "flex", alignItems: "center", gap: 14, minHeight: 60, width: "100%",
                    background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14,
                    padding: "10px 14px", cursor: "pointer", textAlign: "left",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: 12, background: T.goldSoft, color: T.gold,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon size={19} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{a.label}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: T.inkSoft, marginTop: 1 }}>{a.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "#16213A66", zIndex: 200, animation: "fadeIn .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            background: T.paper, borderRadius: "18px 18px 0 0",
            border: `1px solid ${T.line}`, borderBottom: "none",
            boxShadow: "0 -12px 32px rgba(22,33,58,.2)",
            animation: "sheetIn .24s cubic-bezier(.2,.8,.3,1)",
            paddingBottom: "env(safe-area-inset-bottom)",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: T.line, margin: "10px auto 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px 6px" }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, padding: 6, display: "flex" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "8px 16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = item.key === view;
                return (
                  <button key={item.key} onClick={() => { setView(item.key); setMenuOpen(false); }} style={{
                    display: "flex", alignItems: "center", gap: 14, minHeight: 56, width: "100%",
                    background: active ? T.goldSoft : T.paper,
                    border: `1px solid ${active ? T.gold + "33" : T.line}`,
                    borderRadius: 14,
                    padding: "12px 14px", cursor: "pointer", textAlign: "left",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: active ? T.gold + "22" : T.bg,
                      color: active ? T.gold : T.inkSoft,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon size={19} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: active ? 700 : 600, color: active ? T.gold : T.ink }}>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
