import React, { useState } from "react";
import {
  LayoutDashboard, FileText, Receipt, Users, Package, BarChart3,
  Building2, Settings, X, Menu, LogOut, UserCog, Download, FolderKanban, Wallet, Eye, EyeOff, Wifi, WifiOff,
} from "lucide-react";
import { T } from "../lib/theme";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { Modal, Btn } from "./ui";

export const NAV = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "finance", label: "Finance", icon: Wallet, roles: ["administrateur", "comptable"] },
  { key: "projets", label: "Projets", icon: FolderKanban, roles: ["administrateur", "comptable", "commercial"] },
  { key: "devis", label: "Devis", icon: FileText, roles: ["administrateur", "comptable", "commercial", "employe"] },
  { key: "factures", label: "Factures", icon: Receipt, roles: ["administrateur", "comptable", "employe"] },
  { key: "clients", label: "Clients", icon: Users, roles: ["administrateur", "comptable", "commercial"] },
  { key: "produits", label: "Produits & services", icon: Package, roles: ["administrateur", "comptable"] },
  { key: "rapports", label: "Rapports", icon: BarChart3, roles: ["administrateur", "comptable"] },
  { key: "utilisateurs", label: "Utilisateurs", icon: UserCog, roles: ["administrateur"] },
  { key: "entreprise", label: "Entreprise", icon: Building2 },
  { key: "parametres", label: "Paramètres", icon: Settings },
];

export function Shell({ view, setView, onLogout, children, entreprise, role, amountsHidden, onToggleAmounts }) {
  const items = NAV.filter((n) => !n.roles || role === "super_admin" || n.roles.includes(role));
  const current = NAV.find((n) => n.key === view);
  const [navOpen, setNavOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showGenericHelp, setShowGenericHelp] = useState(false);
  const { canInstall, isIosSafariManual, installed, promptInstall } = useInstallPrompt();
  const online = useOnlineStatus();
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
        {!installed && (
          <div style={{ padding: "0 14px 16px 14px" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.gold} 0%, #D49D43 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 10px rgba(201, 138, 43, 0.4)`
                }}>
                  <Download size={14} color="#fff" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  Installer l'application
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: "#B9BFCF", lineHeight: 1.4, margin: 0 }}>
                Accédez à Facturo en un clic directement depuis votre écran d'accueil, même hors ligne.
              </p>
              <button 
                onClick={canInstall ? promptInstall : isIosSafariManual ? () => setShowIosHelp(true) : () => setShowGenericHelp(true)}
                style={{
                  background: `linear-gradient(135deg, ${T.gold} 0%, #D49D43 100%)`,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "8px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s ease-in-out",
                  outline: "none"
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
                onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
              >
                <Download size={13} />
                Installer maintenant
              </button>
            </div>
          </div>
        )}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #ffffff1f" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.gold, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {entreprise?.logoUrl
                ? <img src={entreprise.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : entreprise?.nom?.[0]?.toUpperCase() || "F"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entreprise?.nom}</div>
              {role && <div style={{ fontSize: 10.5, color: "#8891A3", textTransform: "capitalize" }}>{role.replace("_", " ")}</div>}
            </div>
          </div>
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
          <h1 className="app-header-title" style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, flex: 1 }}>{current?.label}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              title={online ? "En ligne — données synchronisées" : "Hors ligne — mode déconnecté actif"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                background: online ? T.tealSoft : T.brickSoft,
                color: online ? T.teal : T.brick,
                border: `1px solid ${online ? T.teal + "33" : T.brick + "33"}`,
                transition: "all 0.3s ease",
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: online ? T.teal : T.brick,
                boxShadow: `0 0 6px ${online ? T.teal : T.brick}`
              }} />
              {online ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{online ? "En ligne" : "Hors ligne"}</span>
            </div>
            <button onClick={onToggleAmounts} title={amountsHidden ? "Afficher les montants" : "Masquer les montants"}
              style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: amountsHidden ? T.gold : T.inkSoft, flexShrink: 0 }}>
              {amountsHidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
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

      {showGenericHelp && (
        <Modal title="Installer Facturo" onClose={() => setShowGenericHelp(false)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, marginBottom: 15 }}>
            Vous pouvez installer Facturo sur votre appareil de plusieurs manières :
          </p>
          <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.8, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <div>
              <b>Sur Ordinateur (Chrome, Edge, Brave...) :</b>
              <br />
              Cliquez sur l'icône de téléchargement dans la barre d'adresse (en haut à droite, à côté de l'étoile des favoris), ou ouvrez le menu du navigateur (les trois points) puis sélectionnez <b>« Installer Facturo »</b>.
            </div>
            <div>
              <b>Sur Mac (Safari) :</b>
              <br />
              Allez dans le menu <b>Fichier</b> de Safari puis sélectionnez <b>« Ajouter au Dock »</b>.
            </div>
            <div>
              <b>Sur Android :</b>
              <br />
              Appuyez sur le menu (les trois points) en haut à droite du navigateur, puis sélectionnez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.
            </div>
          </div>
          <Btn variant="gold" onClick={() => setShowGenericHelp(false)}>Compris</Btn>
        </Modal>
      )}
    </div>
  );
}
