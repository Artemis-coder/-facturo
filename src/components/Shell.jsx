import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, FileText, Receipt, Users, Package, BarChart3,
  Building2, Settings, X, LogOut, UserCog, Download, FolderKanban, Wallet, Eye, EyeOff, Wifi, WifiOff, FileSignature, Briefcase, ChevronDown, Handshake, PanelLeftClose, PanelLeftOpen, MessageSquare,
} from "lucide-react";
import { T, alpha } from "../lib/theme";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { useIsMobile } from "../lib/useIsMobile";
import { Modal, Btn } from "./ui";
import { NotifsBell } from "./NotifsBell";
import { MobileTabBar } from "./MobileTabBar";
import { ThemeToggle } from "./ThemeToggle";
import { useUnreadMessages } from "../lib/unreadMessagesContext.jsx";

export const NAV = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  {
    key: "finance-group", label: "Finance", icon: Wallet, children: [
      { key: "finance", label: "Finance", icon: Wallet, roles: ["administrateur", "comptable"] },
      { key: "rapports", label: "Rapports", icon: BarChart3, roles: ["administrateur", "comptable"] },
    ],
  },
  {
    key: "commercial", label: "Commercial", icon: Briefcase, children: [
      { key: "clients", label: "Clients", icon: Users, roles: ["administrateur", "comptable", "commercial"] },
      { key: "produits", label: "Catalogue", icon: Package, roles: ["administrateur", "comptable"] },
      { key: "devis", label: "Devis", icon: FileText, roles: ["administrateur", "comptable", "commercial", "employe"] },
      { key: "contrats", label: "Contrats", icon: FileSignature, roles: ["administrateur"] },
      { key: "factures", label: "Factures", icon: Receipt, roles: ["administrateur", "comptable", "employe"] },
    ],
  },
  { key: "projets", label: "Projets", icon: FolderKanban, roles: ["administrateur", "comptable", "commercial"] },
  { key: "prestataires", label: "Prestataires", icon: Handshake, roles: ["administrateur", "comptable", "commercial"] },
  { key: "messages", label: "Messages", icon: MessageSquare, roles: ["administrateur", "comptable", "commercial"], showUnreadCount: true },
  { key: "utilisateurs", label: "Utilisateurs", icon: UserCog, roles: ["administrateur"] },
  { key: "entreprise", label: "Entreprise", icon: Building2 },
  { key: "parametres", label: "Paramètres", icon: Settings },
];

const PRIORITY_KEYS_BY_ROLE = {
  administrateur: ["clients", "devis", "factures"],
  super_admin: ["clients", "devis", "factures"],
  comptable: ["clients", "factures", "finance"],
  commercial: ["clients", "devis", "projets"],
  employe: ["devis", "factures"],
};

const QUICK_ACTIONS_BY_ROLE = {
  administrateur: ["client", "devis", "facture"],
  super_admin: ["client", "devis", "facture"],
  comptable: ["client", "facture"],
  commercial: ["client", "devis"],
  employe: [],
};

const QUICK_ACTION_DEFS = {
  client: { kind: "client", targetView: "clients", label: "Nouveau client", sub: "Ajouter un contact au répertoire", icon: Users },
  devis: { kind: "devis", targetView: "devis", label: "Nouveau devis", sub: "Rédiger et chiffrer une proposition", icon: FileText },
  facture: { kind: "facture", targetView: "factures", label: "Nouvelle facture", sub: "Émettre une facture client", icon: Receipt },
};

function buildMobileTabs(navItems, role) {
  const leaves = navItems.flatMap((n) => (n.children ? n.children : [n]));
  const desired = ["dashboard", ...(PRIORITY_KEYS_BY_ROLE[role] || [])];
  const byKey = new Map(leaves.map((l) => [l.key, l]));
  const picked = [];
  for (const k of desired) {
    const leaf = byKey.get(k);
    if (leaf && !picked.some((p) => p.key === leaf.key)) picked.push(leaf);
  }
  if (!picked.some((p) => p.key === "dashboard")) {
    const dash = byKey.get("dashboard");
    if (dash) picked.unshift(dash);
  }
  return picked.slice(0, 4).map((l) => ({ key: l.key, label: l.key === "dashboard" ? "Accueil" : l.label, icon: l.icon }));
}

const isVisible = (n, role) => !n.roles || role === "super_admin" || n.roles.includes(role);

export function Shell({ view, setView, onLogout, children, entreprise, role, amountsHidden, onToggleAmounts, userId, profile, onQuickCreate }) {
  const go = (key) => {
    setView(key);
  };
  const items = NAV
    .filter((n) => isVisible(n, role))
    .map((n) => (n.children ? { ...n, children: n.children.filter((c) => isVisible(c, role)) } : n))
    .filter((n) => !n.children || n.children.length > 0);
  const leaves = NAV.flatMap((n) => (n.children ? n.children : [n]));
  const current = leaves.find((n) => n.key === view);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("mabouate:sidebar:collapsed") === "1"; } catch { return false; }
  });
  const isMobile = useIsMobile();
  useEffect(() => {
    try { localStorage.setItem("mabouate:sidebar:collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);
  const rail = collapsed && !isMobile;
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const online = useOnlineStatus();
  useEffect(() => { setOpenGroups({}); }, [view]);
  const toggleNav = () => setNavOpen((prev) => !prev);

  const mobileTabs = isMobile ? buildMobileTabs(items, role) : [];
  const mobileLeaves = new Set(mobileTabs.map((t) => t.key));
  const mobileQuickActions = isMobile
    ? (QUICK_ACTIONS_BY_ROLE[role] || [])
        .map((kind) => QUICK_ACTION_DEFS[kind])
        .filter((a) => mobileLeaves.has(a.targetView))
        .slice(0, 3)
    : [];
  const mobileMenuItems = isMobile
    ? [
        ...items
          .flatMap((n) => (n.children ? n.children : [n]))
          .filter((n) => !mobileLeaves.has(n.key)),
        { key: "__logout__", label: "Déconnexion", icon: LogOut },
      ]
    : [];

  const unreadMessages = useUnreadMessages();
  const unreadCount = unreadMessages.unreadCount;
  const initiales = (profile?.nom_complet || "").split(" ").filter(Boolean).map((p) => p[0].toUpperCase()).slice(0, 2).join("") || profile?.email?.[0]?.toUpperCase() || "U";
  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: T.ink }}>
      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}
      <aside className={"app-sidebar" + (navOpen ? " open" : "")} style={{ width: rail ? 64 : 232, transition: "width .2s ease", background: T.sidebar, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: rail ? "center" : "space-between" }}>
            <div style={{ display: rail ? "flex" : "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              {rail
                ? <span title="Ma Bouate" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>M</span>
                : (
                  <>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>Ma Bouate</span>
                    <span style={{ width: 5, height: 5, background: T.gold, display: "inline-block" }} />
                  </>
                )
              }
            </div>
            {!rail && (
              <>
                <button className="nav-collapse-btn" onClick={() => setCollapsed(!collapsed)}
                  title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
                  style={{ background: "none", border: "none", color: "#B9BFCF", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
                <button className="nav-close-btn" onClick={() => setNavOpen(false)} style={{ background: "none", border: "none", color: "#B9BFCF", cursor: "pointer", display: "none" }}><X size={20} /></button>
              </>
            )}
            {rail && (
              <button className="nav-collapse-btn" onClick={() => setCollapsed(false)}
                title="Ouvrir le menu"
                style={{ background: "none", border: "none", color: "#B9BFCF", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <PanelLeftOpen size={18} />
              </button>
            )}
          </div>
        <nav style={{ flex: 1, padding: "6px 10px" }}>
          {items.map((n) => {
            const Icon = n.icon;
            if (n.children) {
              const activeInGroup = n.children.some((c) => c.key === view);
              const isOpen = openGroups[n.key] ?? activeInGroup;
              return (
                <div key={n.key}>
                  <div className="nav-item" onClick={rail ? (() => { setCollapsed(false); setOpenGroups((p) => ({ ...p, [n.key]: true })); }) : () => setOpenGroups((p) => ({ ...p, [n.key]: !(p[n.key] ?? activeInGroup) }))} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: rail ? "10px 0" : "10px 12px", marginBottom: 2,
                    borderRadius: 9, cursor: "pointer", fontSize: 13.5, position: "relative",
                    background: activeInGroup ? "#ffffff14" : "transparent", color: activeInGroup ? "#fff" : "#B9BFCF",
                    borderLeft: activeInGroup ? `3px solid ${T.gold}` : "3px solid transparent",
                    justifyContent: rail ? "center" : "flex-start",
                  }} title={n.label}>
                    <Icon size={16} />{!rail && n.label}
                    {!rail && <ChevronDown size={14} style={{ marginLeft: "auto", transition: "transform .2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />}
                  </div>
                  <div style={{
                    overflow: "hidden",
                    maxHeight: isOpen ? n.children.length * 44 : 0,
                    transition: "max-height .25s ease",
                  }}>
                    {n.children.map((c) => {
                      const cActive = c.key === view;
                      const CIcon = c.icon;
                      return (
                        <div key={c.key} className="nav-item" onClick={() => go(c.key)} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "9px 12px 9px 36px", marginBottom: 2,
                          borderRadius: 9, cursor: "pointer", fontSize: 13, position: "relative",
                          background: cActive ? "#ffffff14" : "transparent", color: cActive ? "#fff" : "#B9BFCF",
                          borderLeft: cActive ? `3px solid ${T.gold}` : "3px solid transparent",
                        }}>
                          <CIcon size={15} />{c.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            const active = n.key === view;
              return (
                <div key={n.key} className="nav-item" onClick={() => go(n.key)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: rail ? "10px 0" : "10px 12px", marginBottom: 2,
                  borderRadius: 9, cursor: "pointer", fontSize: 13.5, position: "relative",
                  background: active ? "#ffffff14" : "transparent", color: active ? "#fff" : "#B9BFCF",
                  borderLeft: active ? `3px solid ${T.gold}` : "3px solid transparent",
                  justifyContent: rail ? "center" : "flex-start",
                }} title={n.label}>
                  <Icon size={16} />{!rail && n.label}
                  {n.showUnreadCount && unreadCount > 0 && (
                    <span style={{
                      position: "absolute",
                      top: rail ? -2 : -4,
                      right: rail ? -2 : -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: T.gold,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 5px",
                      boxShadow: `0 0 0 2px ${T.sidebar}`,
                    }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              );
          })}
        </nav>
        {!installed && !rail && (
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
                Accédez à Ma Bouate en un clic directement depuis votre écran d'accueil, même hors ligne.
              </p>
              <button
                onClick={() => {
                  if (canInstall) {
                    promptInstall();
                  }
                  setShowInstallModal(true);
                }}
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
        {!rail && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #ffffff1f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: T.gold, color: T.goldFg, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
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
        )}
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>
        <header className="app-header" style={{ background: T.paper, borderBottom: `1px solid ${T.line}`, padding: "18px 30px", display: "flex", alignItems: "center", gap: 14 }}>
          <h1 className="app-header-title" style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{current?.label}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10 }}>
            <div
              className="connection-pill"
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
                border: `1px solid ${alpha(online ? T.teal : T.brick, 20)}`,
                transition: "all 0.3s ease",
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: online ? T.teal : T.brick,
                boxShadow: `0 0 6px ${online ? T.teal : T.brick}`
              }} />
              {online ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="connection-label">{online ? "En ligne" : "Hors ligne"}</span>
            </div>
            <NotifsBell userId={userId} entrepriseId={entreprise?.id} />
            <ThemeToggle />
            <button onClick={onToggleAmounts} title={amountsHidden ? "Afficher les montants" : "Masquer les montants"}
              style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: amountsHidden ? T.gold : T.inkSoft, flexShrink: 0 }}>
              {amountsHidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setProfileOpen((o) => !o)} title="Mon profil"
                style={{ background: "none", border: "none", borderRadius: 8, padding: "4px 6px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: T.gold, color: T.goldFg, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {initiales}
                </span>
                <span className="user-profile-name" style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.nom_complet}</span>
                <ChevronDown size={14} className="user-profile-name" style={{ color: T.inkSoft, transition: "transform .2s ease", transform: profileOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {profileOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setProfileOpen(false)} />
                  <div className="profile-popover" style={{ position: "absolute", top: 44, right: 0, width: 260, maxWidth: "calc(100vw - 32px)", background: T.paper, border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: `0 12px 32px ${alpha(T.sidebar, 16)}`, zIndex: 201, overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    <div style={{ padding: 14, borderBottom: `1px solid ${T.line}`, background: T.bg, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: T.gold, color: T.goldFg, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {initiales}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{profile?.nom_complet || "Utilisateur"}</div>
                        <div style={{ fontSize: 11.5, color: T.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.email}</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 12.5, color: T.ink }}>
                        <span style={{ color: T.inkSoft }}>Rôle</span>
                        <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{role?.replace("_", " ")}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", paddingTop: 0, fontSize: 12.5, color: T.ink, gap: 10 }}>
                        <span style={{ color: T.inkSoft, flexShrink: 0 }}>Entreprise</span>
                        <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entreprise?.nom}</span>
                      </div>
                    </div>
                    <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.line}` }}>
                      <button onClick={() => { setProfileOpen(false); setConfirmingLogout(true); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "none", border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, color: T.brick, cursor: "pointer" }}>
                        <LogOut size={14} /> Se déconnecter
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="app-content" style={{ padding: 30, ...(view === "messages" ? { display: "flex", flexDirection: "column" } : {}) }}>{children}</div>
      </main>

      {isMobile && (
        <MobileTabBar
          tabs={mobileTabs}
          quickActions={mobileQuickActions}
          menuItems={mobileMenuItems}
          view={view}
          setView={go}
          onOpenMenu={() => {}}
          onQuickCreate={onQuickCreate}
        />
      )}

      {confirmingLogout && (
        <Modal title="Se déconnecter ?" onClose={() => setConfirmingLogout(false)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Vous allez être déconnecté de Ma Bouate. Vos données restent enregistrées et
            vous pourrez vous reconnecter à tout moment avec votre e-mail et votre mot de passe.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="danger" onClick={() => { setConfirmingLogout(false); onLogout(); }}>Oui, me déconnecter</Btn>
            <Btn variant="ghost" onClick={() => setConfirmingLogout(false)}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {showInstallModal && (
        <Modal title="Processus d'installation" onClose={() => setShowInstallModal(false)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
            Installez l'application Ma Bouate sur votre ordinateur ou votre smartphone pour un accès direct en un clic, même hors ligne.
          </p>

          <div style={{ background: T.bg, padding: 14, borderRadius: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Download size={15} style={{ color: T.gold }} /> Selon votre navigateur et votre appareil :
            </div>

            <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <b>Sur Chrome, Edge, Brave & Android :</b>
                <br />
                Cliquez sur le bouton <b>« Installer maintenant »</b> ci-dessous pour déclencher l'installation directe sur votre machine.
              </div>
              <div>
                <b>Sur Mac (Safari) :</b>
                <br />
                Allez dans le menu <b>Fichier</b> en haut de Safari puis sélectionnez <b>« Ajouter au Dock »</b>.
              </div>
              <div>
                <b>Sur iPhone & iPad (Safari) :</b>
                <br />
                Appuyez sur le bouton <b>Partager</b> (le carré avec la flèche vers le haut), puis défilez et touchez <b>« Sur l'écran d'accueil »</b>.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowInstallModal(false)}>
              Fermer
            </Btn>
            <Btn
              variant="gold"
              onClick={async () => {
                if (canInstall) {
                  await promptInstall();
                }
                setShowInstallModal(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} /> Installer maintenant
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
