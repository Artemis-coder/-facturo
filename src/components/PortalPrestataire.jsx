import React, { useState, useEffect } from "react";
import {
  FolderKanban, FileSignature, ListTodo, Bell, LogOut, X, Plus, Menu,
  Download, MessageCircle, CalendarClock, AlertTriangle, Handshake, Wifi, WifiOff,
} from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { alerteTache, SEUIL_ALERTE_JOURS } from "../lib/helpers";
import { usePrestatairePortal } from "../lib/usePrestatairePortal";
import { useOnlineStatus } from "../lib/useOnlineStatus";
import { downloadContractPdf } from "../lib/contractPdf";
import { Btn, Modal, Field, Select, Badge, Card, EmptyState, Toast, LoadingState } from "./ui";
import { supabase } from "../lib/supabaseClient";

const NAV_ITEMS = [
  { key: "projets", label: "Mes projets", icon: FolderKanban },
  { key: "contrats", label: "Mes contrats", icon: FileSignature },
  { key: "taches", label: "Mes tâches", icon: ListTodo },
];

const STATUTS_TACHE = ["À faire", "En cours", "Terminée"];

const formatDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR") : "—");

function AlerteBadge({ alr }) {
  if (!alr) return null;
  if (alr.level === "retard") {
    return <span style={{ background: T.brickSoft, color: T.brick, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", padding: "3px 8px", borderRadius: 20, border: `1px solid ${T.brick}33`, whiteSpace: "nowrap", fontWeight: 600 }}>En retard de {alr.jours} j</span>;
  }
  return <span style={{ background: T.goldSoft, color: T.gold, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", padding: "3px 8px", borderRadius: 20, border: `1px solid ${T.gold}33`, whiteSpace: "nowrap", fontWeight: 600 }}>{alr.jours === 0 ? "Aujourd'hui" : `J-${alr.jours}`}</span>;
}

export function PortalPrestataire({ entrepriseId, userId, entreprise, onLogout }) {
  const { prestataire, liens, projets, contrats, taches, loading, saveTache, changerStatutTache } = usePrestatairePortal(entrepriseId, userId);
  const [tab, setTab] = useState("projets");
  const [editingTache, setEditingTache] = useState(null);
  const [viewingContrat, setViewingContrat] = useState(null);
  const [alertesOpen, setAlertesOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [toast, setToast] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const online = useOnlineStatus();
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const projetDe = (id) => projets.find((p) => p.id === id);
  const tachesDe = (projetId) => taches.filter((t) => t.projetId === projetId);

  const alertes = taches.map((t) => ({ tache: t, alr: alerteTache(t) })).filter((x) => x.alr);
  const enRetard = alertes.filter((x) => x.alr.level === "retard");
  const proches = alertes.filter((x) => x.alr.level === "proche");

  useEffect(() => {
    if (!alertesOpen) return;
    const close = () => setAlertesOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [alertesOpen]);

  const go = (key) => { setTab(key); setNavOpen(false); setAlertesOpen(false); };

  const saveTacheHandler = async (form) => {
    if (!form.titre.trim()) return notify("Le titre de la tâche est requis.");
    if (!form.projetId) return notify("Choisissez un projet pour cette tâche.");
    const { error } = await saveTache(form);
    notify(error ? "Échec : " + error.message : (form.id ? "Tâche mise à jour" : "Tâche ajoutée"));
    if (!error) setEditingTache(null);
  };

  const changerStatut = async (tache, statut) => {
    const { error } = await changerStatutTache(tache, statut);
    notify(error ? "Échec : " + error.message : "Statut mis à jour");
  };

  const ouvrirWhatsApp = (contract) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Bonjour,\n\nConcernant le contrat « ${contract.titre} ».\n\nCordialement,\n${prestataire?.nom || "Votre prestataire"}`)}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><LoadingState label="Chargement de votre espace…" /></div>;
  }

  if (!prestataire) {
    return (
      <div style={{ minHeight: "100vh", background: T.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <Handshake size={36} color={T.gold} style={{ marginBottom: 14 }} />
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, marginBottom: 10 }}>Espace prestataire indisponible</div>
          <p style={{ color: "#B9BFCF", fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
            Votre compte n'est relié à aucune fiche prestataire. Contactez l'entreprise qui vous a invité
            pour qu'elle vérifie votre fiche.
          </p>
          <Btn variant="ghost" icon={LogOut} onClick={onLogout}>Se déconnecter</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'IBM Plex Sans', sans-serif", color: T.ink }}>
      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}
      <aside className={"app-sidebar" + (navOpen ? " open" : "")} style={{ width: 232, background: T.ink, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>Ma Bouate</span>
            <span style={{ width: 5, height: 5, background: T.gold, display: "inline-block" }} />
          </div>
          <button className="nav-close-btn" onClick={() => setNavOpen(false)} style={{ background: "none", border: "none", color: "#B9BFCF", cursor: "pointer", display: "none" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "0 20px 18px", borderBottom: "1px solid #ffffff1f" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
            <Handshake size={13} /> Espace Prestataire
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 10px" }}>
          {NAV_ITEMS.map((n) => {
            const active = n.key === tab;
            const Icon = n.icon;
            return (
              <div key={n.key} onClick={() => go(n.key)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 2,
                borderRadius: 9, cursor: "pointer", fontSize: 13.5, position: "relative",
                background: active ? "#ffffff14" : "transparent", color: active ? "#fff" : "#B9BFCF",
                borderLeft: active ? `3px solid ${T.gold}` : "3px solid transparent",
              }}>
                <Icon size={16} />{n.label}
                {n.key === "taches" && alertes.length > 0 && (
                  <span style={{ marginLeft: "auto", background: T.brick, color: "#fff", fontSize: 10.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", borderRadius: 12, padding: "1px 7px" }}>{alertes.length}</span>
                )}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #ffffff1f" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.gold, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {prestataire.nom?.[0]?.toUpperCase() || "P"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prestataire.nom}</div>
              <div style={{ fontSize: 10.5, color: "#8891A3" }}>{entreprise?.nom}</div>
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
          <h1 className="app-header-title" style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, flex: 1 }}>
            {NAV_ITEMS.find((n) => n.key === tab)?.label}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <div title={online ? "En ligne — données synchronisées" : "Hors ligne — mode déconnecté actif"}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: online ? T.tealSoft : T.brickSoft, color: online ? T.teal : T.brick, border: `1px solid ${online ? T.teal + "33" : T.brick + "33"}` }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: online ? T.teal : T.brick, boxShadow: `0 0 6px ${online ? T.teal : T.brick}` }} />
              {online ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{online ? "En ligne" : "Hors ligne"}</span>
            </div>
            <button onClick={() => setAlertesOpen(!alertesOpen)} title="Alertes d'échéance"
              style={{ position: "relative", background: "none", border: `1px solid ${T.line}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: alertes.length > 0 ? T.brick : T.inkSoft, flexShrink: 0 }}>
              <Bell size={17} />
              {alertes.length > 0 && (
                <span style={{ position: "absolute", top: -5, right: -5, background: T.brick, color: "#fff", fontSize: 9.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", borderRadius: 10, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>{alertes.length}</span>
              )}
            </button>
            {alertesOpen && (
              <div style={{ position: "absolute", top: 44, right: 0, width: 320, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(22,33,58,.16)", zIndex: 40, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>Échéances à surveiller</span>
                  <button onClick={() => setAlertesOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, display: "flex" }}><X size={14} /></button>
                </div>
                {alertes.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: T.inkSoft }}>Aucune alerte — toutes vos tâches sont à jour.</div>}
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {alertes.map(({ tache, alr }) => (
                    <div key={tache.id} onClick={() => { setTab("taches"); setAlertesOpen(false); }} style={{ padding: "10px 16px", borderBottom: `1px solid ${T.line}`, cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tache.titre}</div>
                        <div style={{ fontSize: 11, color: T.inkSoft }}>{projetDe(tache.projetId)?.nom || "Projet"} · éch. {formatDate(tache.echeance)}</div>
                      </div>
                      <AlerteBadge alr={alr} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="app-content" style={{ padding: 30 }}>
          {alertes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: enRetard.length > 0 ? T.brickSoft : T.goldSoft, border: `1px solid ${enRetard.length > 0 ? T.brick : T.gold}33`, marginBottom: 18, flexWrap: "wrap" }}>
              <AlertTriangle size={16} color={enRetard.length > 0 ? T.brick : T.gold} />
              <span style={{ fontSize: 12.5, color: T.ink, fontWeight: 600 }}>
                {enRetard.length > 0 && `${enRetard.length} tâche${enRetard.length > 1 ? "s" : ""} en retard`}
                {enRetard.length > 0 && proches.length > 0 && " · "}
                {proches.length > 0 && `${proches.length} à échéance sous ${SEUIL_ALERTE_JOURS} jours`}
              </span>
              <Btn variant="ghost" small onClick={() => setTab("taches")} style={{ marginLeft: "auto" }}>Voir mes tâches</Btn>
            </div>
          )}

          {tab === "projets" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {liens.length === 0 && <div style={{ gridColumn: "1 / -1" }}><EmptyState icon={FolderKanban} title="Aucun projet" subtitle="Vous n'êtes affecté à aucun projet pour le moment." /></div>}
              {liens.map((l) => {
                const pr = projetDe(l.projetId);
                if (!pr) return null;
                const done = tachesDe(pr.id).filter((t) => t.statut === "Terminée").length;
                const total = tachesDe(pr.id).length;
                return (
                  <Card key={l.id} style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600 }}>{pr.nom}</div>
                      <Badge statut={pr.statut} />
                    </div>
                    {l.mission && <div style={{ fontSize: 12.5, color: T.gold, fontWeight: 600, marginBottom: 6 }}>Mission : {l.mission}</div>}
                    {pr.description && <p style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6, margin: "0 0 10px" }}>{pr.description}</p>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.inkSoft }}>
                      <span><ListTodo size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />{done}/{total} tâches terminées</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatDate(pr.createdAt?.slice(0, 10))}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "contrats" && (
            <div>
              {contrats.length === 0 && <EmptyState icon={FileSignature} title="Aucun contrat" subtitle="Les contrats qui vous concernent apparaîtront ici." />}
              {contrats.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", background: T.paper, border: `1px solid ${T.line}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, flexWrap: "wrap" }}>
                    <FileSignature size={15} color={T.inkSoft} />
                    <span style={{ fontWeight: 600 }}>{c.titre}</span>
                    <Badge statut={c.statut} />
                    {c.envoyeLe && <span style={{ fontSize: 11.5, color: T.inkSoft }}>Envoyé le {formatDate(c.envoyeLe)}</span>}
                  </div>
                  <Btn variant="ghost" small onClick={() => setViewingContrat(c)}>Consulter</Btn>
                </div>
              ))}
            </div>
          )}

          {tab === "taches" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 12.5, color: T.inkSoft }}>
                  {taches.filter((t) => t.statut !== "Terminée").length} tâche{taches.filter((t) => t.statut !== "Terminée").length > 1 ? "s" : ""} à réaliser
                </div>
                <Btn icon={Plus} onClick={() => setEditingTache({ titre: "", description: "", statut: "À faire", echeance: "", projetId: liens[0]?.projetId || "", prestataireId: prestataire.id })}>Nouvelle tâche</Btn>
              </div>
              {projets.map((pr) => {
                const tachesDuPr = tachesDe(pr.id);
                if (tachesDuPr.length === 0) return null;
                const done = tachesDuPr.filter((t) => t.statut === "Terminée").length;
                const pct = Math.round((done / tachesDuPr.length) * 100);
                return (
                  <div key={pr.id} style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 10, marginBottom: 14 }}>
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.line}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, fontWeight: 600 }}><FolderKanban size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{pr.nom}</span>
                        <span style={{ fontSize: 11.5, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{done}/{tachesDuPr.length} ({pct}%)</span>
                      </div>
                      <div style={{ height: 5, background: T.bg, borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? T.teal : T.gold, transition: "width .3s ease" }} />
                      </div>
                    </div>
                    {tachesDuPr.map((t) => {
                      const alr = alerteTache(t);
                      return (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px dashed ${T.line}`, flexWrap: "wrap" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{t.titre}</span>
                              {alr && <AlerteBadge alr={alr} />}
                            </div>
                            {t.description && <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{t.description}</div>}
                            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4, fontSize: 11.5, color: T.inkSoft }}>
                              {t.echeance && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarClock size={12} />{formatDate(t.echeance)}</span>}
                            </div>
                          </div>
                          <Select wrapperStyle={{ width: 135 }} value={t.statut} onChange={(e) => changerStatut(t, e.target.value)}>
                            {STATUTS_TACHE.map((s) => <option key={s} value={s}>{s}</option>)}
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {taches.length === 0 && <EmptyState icon={ListTodo} title="Aucune tâche" subtitle="Ajoutez les tâches que vous devez réaliser sur vos projets." />}
            </div>
          )}
        </div>
      </main>

      {editingTache && (
        <Modal title={editingTache.id ? "Modifier la tâche" : "Nouvelle tâche"} onClose={() => setEditingTache(null)}>
          <TachePortailForm data={editingTache} projets={projets} onSave={saveTacheHandler} />
        </Modal>
      )}

      {viewingContrat && (
        <Modal title={viewingContrat.titre} onClose={() => setViewingContrat(null)} wide>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15 }}>
            <Badge statut={viewingContrat.statut} />
            {viewingContrat.envoyeLe && <span style={{ fontSize: 12, color: T.inkSoft }}>Envoyé le {formatDate(viewingContrat.envoyeLe)}</span>}
            {viewingContrat.signeLe && <span style={{ fontSize: 12, color: T.teal }}>Signé le {formatDate(viewingContrat.signeLe)}</span>}
          </div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, padding: 16, maxHeight: 420, overflow: "auto" }}>{viewingContrat.contenu}</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}>
            <Btn icon={Download} onClick={() => downloadContractPdf(viewingContrat, null, entreprise)}>Télécharger le PDF</Btn>
            <Btn variant="ghost" icon={MessageCircle} onClick={() => ouvrirWhatsApp(viewingContrat)}>Ouvrir WhatsApp</Btn>
          </div>
        </Modal>
      )}

      {confirmingLogout && (
        <Modal title="Se déconnecter ?" onClose={() => setConfirmingLogout(false)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Vous allez fermer votre espace prestataire. Vous pourrez vous reconnecter à tout moment.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="danger" onClick={() => { setConfirmingLogout(false); onLogout(); }}>Oui, me déconnecter</Btn>
            <Btn variant="ghost" onClick={() => setConfirmingLogout(false)}>Annuler</Btn>
          </div>
        </Modal>
      )}

      <Toast message={toast} />
    </div>
  );
}

function TachePortailForm({ data, projets, onSave }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <Field label="Titre de la tâche *"><input style={inputStyle} value={form.titre} onChange={set("titre")} placeholder="Ex. Finaliser les maquettes" /></Field>
      {projets.length > 0 && (
        <Field label="Projet concerné">
          <Select value={form.projetId || ""} onChange={set("projetId")}>
            {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Statut">
        <Select value={form.statut} onChange={set("statut")}>
          {STATUTS_TACHE.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
      <Field label={`Date d'échéance (alerte à J-${SEUIL_ALERTE_JOURS} et en retard)`}>
        <input type="date" style={inputStyle} value={form.echeance || ""} onChange={set("echeance")} />
      </Field>
      <Field label="Description"><textarea style={{ ...inputStyle, height: "auto", minHeight: 80, padding: "10px 12px" }} value={form.description} onChange={set("description")} /></Field>
      <Btn variant="gold" onClick={() => onSave(form)}>Enregistrer</Btn>
    </div>
  );
}
