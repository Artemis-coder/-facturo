import React, { useState } from "react";
import {
  LayoutDashboard, FileText, Receipt, Users, Package, BarChart3,
  Building2, Settings, X, Menu, LogOut, UserCog, Download,
} from "lucide-react";
import { T } from "../lib/theme";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { Modal, Btn } from "./ui";

export const NAV = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "devis", label: "Devis", icon: FileText, roles: ["administrateur", "comptable", "commercial", "employe"] },
  { key: "factures", label: "Factures", icon: Receipt, roles: ["administrateur", "comptable", "employe"] },
  { key: "clients", label: "Clients", icon: Users, roles: ["administrateur", "comptable", "commercial"] },
  { key: "produits", label: "Produits & services", icon: Package, roles: ["administrateur", "comptable"] },
  { key: "rapports", label: "Rapports", icon: BarChart3, roles: ["administrateur", "comptable"] },
  { key: "utilisateurs", label: "Utilisateurs", icon: UserCog, roles: ["administrateur"] },
  { key: "entreprise", label: "Entreprise", icon: Building2 },
  { key: "parametres", label: "Paramètres", icon: Settings },
];

export function Shell({ view, setView, onLogout, children, entreprise, role }) {
  const items = NAV.filter((n) => !n.roles || role === "super_admin" || n.roles.includes(role));
  const current = NAV.find((n) => n.key === view);
  const [navOpen, setNavOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const { canInstall, isIosSafariManual, promptInstall } = useInstallPrompt();
  const go = (key) => { setView(key); setNavOpen(false); };
  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: T.ink }}>
      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}
      <aside className={"app-sidebar" + (navOpen ? " open" : "")} style={{ width: 232, background: T.ink, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>Facturo</span>
            <span style={{ width: 5, height: 5, background: T.gold, display: "inline-block" }} />
          </div>
          <button className="nav-close-btn" onClick={() => setNavOpen(false)} style={{ background: "none", border: "none", color: "#B9BFCF", cursor: "pointer", display: "none" }}><X size={20} /></button>
        </div>
        <nav style={{ flex: 1, padding: "6px 10px" }}>
          {items.map((n) => {
            const active = n.key === view;
            const Icon = n.icon;
            return (
              <div key={n.key} onClick={() => go(n.key)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 2,
                borderRadius: 9, cursor: "pointer", fontSize: 13.5, position: "relative",
                background: active ? "#ffffff14" : "transparent", color: active ? "#fff" : "#B9BFCF",
                borderLeft: active ? `3px solid ${T.gold}` : "3px solid transparent",
              }}>
                <Icon size={16} />{n.label}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #ffffff1f" }}>
          <div style={{ fontSize: 12, color: "#B9BFCF", marginBottom: 10 }}>{entreprise?.nom}</div>
          {(canInstall || isIosSafariManual) && (
            <div
              onClick={canInstall ? promptInstall : () => setShowIosHelp(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.gold, cursor: "pointer", marginBottom: 12 }}
            >
              <Download size={15} /> Installer l'application
            </div>
          )}
          <div onClick={() => setConfirmingLogout(true)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#B9BFCF", cursor: "pointer" }}>
            <LogOut size={15} /> Déconnexion
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>
        <header className="app-header" style={{ background: T.paper, borderBottom: `1px solid ${T.line}`, padding: "18px 30px", display: "flex", alignItems: "center", gap: 14 }}>
          <button className="nav-menu-btn" onClick={() => setNavOpen(true)} style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 8, width: 36, height: 36, display: "none", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.ink, flexShrink: 0 }}>
            <Menu size={18} />
          </button>
          <h1 className="app-header-title" style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 21 }}>{current?.label}</h1>
        </header>
        <div className="app-content" style={{ padding: 30 }}>{children}</div>
      </main>

      {confirmingLogout && (
        <Modal title="Se déconnecter ?" onClose={() => setConfirmingLogout(false)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Vous allez être déconnecté de Facturo. Vos données restent enregistrées et
            vous pourrez vous reconnecter à tout moment avec votre e-mail et votre mot de passe.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="danger" onClick={() => { setConfirmingLogout(false); onLogout(); }}>Oui, me déconnecter</Btn>
            <Btn variant="ghost" onClick={() => setConfirmingLogout(false)}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {showIosHelp && (
        <Modal title="Installer Facturo sur iPhone/iPad" onClose={() => setShowIosHelp(false)}>
          <ol style={{ fontSize: 13, color: T.inkSoft, lineHeight: 2, paddingLeft: 20, marginBottom: 20 }}>
            <li>Appuyez sur l'icône <b>Partager</b> en bas de Safari (le carré avec une flèche vers le haut)</li>
            <li>Faites défiler et appuyez sur <b>« Sur l'écran d'accueil »</b></li>
            <li>Appuyez sur <b>Ajouter</b> — Facturo apparaît comme une vraie application, icône comprise</li>
          </ol>
          <Btn variant="gold" onClick={() => setShowIosHelp(false)}>Compris</Btn>
        </Modal>
      )}
    </div>
  );
}
