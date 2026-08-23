import React, { useRef, useState } from "react";
import { Plus, Pencil, FolderKanban, Link2, X, Trash2, Clock, CheckCircle2, AlertCircle, DollarSign, CalendarClock, ListTodo, Paperclip, Download, Upload } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals, montantEncaisseTotal, alerteTache, SEUIL_ALERTE_JOURS } from "../lib/helpers";
import { formatTaille, telechargerFichier } from "../lib/fichierUtils";
import { FICHIER_CATEGORIES } from "../lib/useFichiersProjets";
import { IconeFichier, CategorieBadge, FichierApercu } from "./FichierApercu";
import { TableShell, Btn, Modal, Field, Select, Badge, Card, EmptyState, KpiBar } from "./ui";

const formatHorodatage = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

const STATUTS = ["En cours", "Terminé", "Annulé"];
const STATUT_TONE = { "En cours": T.slate, "Terminé": T.teal, "Annulé": T.brick };
const STATUTS_TACHE = ["À faire", "En cours", "Terminée", "Bloquée"];

function formatDate(iso) { return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR") : "—"; }

function TacheAlerteBadge({ tache }) {
  const alr = alerteTache(tache);
  if (!alr) return null;
  if (alr.level === "retard") return <Badge statut="En retard" />;
  return (
    <span style={{ background: T.goldSoft, color: T.gold, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", padding: "3px 8px", borderRadius: 20, border: `1px solid ${T.gold}33`, whiteSpace: "nowrap", fontWeight: 600 }}>
      {alr.jours === 0 ? "Aujourd'hui" : `J-${alr.jours}`}
    </span>
  );
}

export function Projets({ projets, clients, devis, factures, prestataires = [], liensPrestataires = [], taches = [], fichiersProjets = [], affecterPrestataire, detacherPrestataire, saveTache, deleteTache, saveProjet, changerStatut, deleteProjet, lierDevis, lierFacture, uploadFichier, supprimerFichier, notify, canManage = true, canDelete = false }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [editingTache, setEditingTache] = useState(null);
  const [fichierEnPreview, setFichierEnPreview] = useState(null);

  const cli = (id) => clients.find((c) => c.id === id);
  const devisDe = (projetId) => devis.filter((d) => d.projetId === projetId);
  const facturesDe = (projetId) => factures.filter((f) => f.projetId === projetId);
  const montantEncaisseDe = (projetId) => montantEncaisseTotal(facturesDe(projetId));
  const prestatairesDe = (projetId) => liensPrestataires.filter((l) => l.projetId === projetId);
  const prestataireDe = (id) => prestataires.find((p) => p.id === id);
  const tachesDuProjet = (projetId) => taches.filter((t) => t.projetId === projetId);
  const fichiersDe = (projetId) => fichiersProjets.filter((f) => f.projetId === projetId);

  const list = projets.filter((p) => (p.nom + (cli(p.clientId)?.societe || "")).toLowerCase().includes(q.toLowerCase()));

  const totalProjets = projets.length;
  const enCoursCount = projets.filter((p) => p.statut === "En cours").length;
  const terminesCount = projets.filter((p) => p.statut === "Terminé").length;
  const enAttenteCount = projets.filter((p) => p.statut === "En attente" || p.statut === "Annulé").length;
  const totalEncaisseProjets = projets.reduce((sum, p) => sum + montantEncaisseDe(p.id), 0);

  const kpis = [
    { label: "Total Projets", value: `${totalProjets}`, sub: "Dossiers enregistrés", tone: T.ink, icon: FolderKanban },
    { label: "Projets En Cours", value: `${enCoursCount}`, sub: "Production / exécution", tone: T.gold, icon: Clock },
    { label: "Projets Terminés", value: `${terminesCount}`, sub: "Livrés & clôturés", tone: T.teal, icon: CheckCircle2 },
    { label: "En Attente / Annulés", value: `${enAttenteCount}`, sub: "Stand-by ou annulés", tone: T.brick, icon: AlertCircle },
    { label: "Encaissements Projets", value: fmt(totalEncaisseProjets), sub: "Total réglé sur factures liées", tone: T.slate, icon: DollarSign },
  ];

  const save = async (form) => {
    const { error } = await saveProjet(form);
    notify(error ? "Échec : " + error.message : (form.id ? "Projet mis à jour" : "Projet créé"));
    if (!error) setEditing(null);
  };

  const changer = async (projetId, statut) => {
    const { error } = await changerStatut(projetId, statut);
    notify(error ? "Échec : " + error.message : "Statut du projet mis à jour");
    setDetail((d) => (d ? { ...d, statut } : d));
  };

  const confirmerSuppression = async () => {
    const { error } = await deleteProjet(deleting.id);
    notify(error ? "Suppression refusée : " + error.message : "Projet supprimé (les devis/factures liés sont conservés, simplement détachés)");
    setDeleting(null);
    setDetail(null);
  };

  const telechargerFichierHandler = async (fichier) => {
    const { error } = await telechargerFichier(fichier);
    notify(error ? "Échec du téléchargement : " + error.message : "Téléchargement démarré");
  };

  const supprimerFichierHandler = async (fichier) => {
    const { error } = await supprimerFichier(fichier);
    notify(error ? "Suppression refusée : " + error.message : "Fichier supprimé");
  };

  return (
    <div>
      <KpiBar items={kpis} />
      <TableShell headers={["Nom", "Client", "Statut", "Devis liés", "Factures liées", "Prestataires", "Fichiers", "Encaissé", ""]} onSearch={setQ}
        searchPlaceholder="Rechercher un projet…"
        action={canManage && <Btn icon={Plus} onClick={() => setEditing({ nom: "", description: "", clientId: "" })}>Nouveau projet</Btn>}>
        {list.length === 0 && (
          <tr><td colSpan={9}><EmptyState icon={FolderKanban} title="Aucun projet" subtitle="Regroupez vos devis et factures par projet pour un meilleur suivi." /></td></tr>
        )}
        {list.map((p) => (
          <tr key={p.id}>
            <td style={{ ...td, fontWeight: 600 }}>
              <a style={{ color: T.ink, cursor: "pointer" }} onClick={() => setDetail(p)}>{p.nom}</a>
            </td>
            <td style={td}>{cli(p.clientId)?.societe || "—"}</td>
            <td style={td}>
              <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 0.4, color: STATUT_TONE[p.statut] }}>{p.statut}</span>
            </td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{devisDe(p.id).length}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{facturesDe(p.id).length}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{prestatairesDe(p.id).length}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{fichiersDe(p.id).length}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(montantEncaisseDe(p.id))}</td>
            <td style={{ ...td, textAlign: "right" }}>
              <Btn variant="ghost" small onClick={() => setDetail(p)}>Voir</Btn>
            </td>
          </tr>
        ))}
      </TableShell>

      {editing && (
        <Modal title={editing.id ? "Modifier le projet" : "Nouveau projet"} onClose={() => setEditing(null)}>
          <ProjetForm data={editing} clients={clients} onSave={save} />
        </Modal>
      )}

      {detail && (
        <Modal title={detail.nom} onClose={() => setDetail(null)} wide>
          <ProjetDetail
            projet={detail} client={cli(detail.clientId)}
            devisLies={devisDe(detail.id)} facturesLiees={facturesDe(detail.id)}
            montantEncaisse={montantEncaisseDe(detail.id)}
            devisDisponibles={devis.filter((d) => d.projetId !== detail.id)}
            facturesDisponibles={factures.filter((f) => f.projetId !== detail.id)}
            clients={clients}
            prestatairesLies={prestatairesDe(detail.id)}
            prestatairesDisponibles={prestataires.filter((pr) => !prestatairesDe(detail.id).some((l) => l.prestataireId === pr.id))}
            prestataireDe={(id) => prestataires.find((p) => p.id === id)}
            taches={tachesDuProjet(detail.id)}
            fichiers={fichiersDe(detail.id)}
            canManage={canManage} canDelete={canDelete}
            onFichierApercu={setFichierEnPreview}
            onTelechargerFichier={telechargerFichierHandler}
            onSupprimerFichier={supprimerFichierHandler}
            onUploaderFichier={async (file, categorie) => {
              const { error, fichier } = await uploadFichier({ projetId: detail.id, file, categorie });
              notify(error ? "Échec de l'envoi : " + error.message : `« ${fichier.nom} » mis à disposition des prestataires`);
              return { error };
            }}
            onChangerStatut={(s) => changer(detail.id, s)}
            onModifier={() => { setEditing(detail); setDetail(null); }}
            onSupprimer={() => setDeleting(detail)}
            onLierDevis={async (d) => { await lierDevis(d, detail.id); notify("Devis rattaché au projet"); }}
            onDetacherDevis={async (d) => { await lierDevis(d, null); notify("Devis détaché du projet"); }}
            onLierFacture={async (f) => { await lierFacture(f, detail.id); notify("Facture rattachée au projet"); }}
            onDetacherFacture={async (f) => { await lierFacture(f, null); notify("Facture détachée du projet"); }}
            onAffecterPrestataire={async (prestataireId, mission) => { const res = await affecterPrestataire({ projetId: detail.id, prestataireId, mission }); notify(res.error ? "Échec : " + res.error.message : "Prestataire affecté au projet"); return res; }}
            onDetacherPrestataire={async (linkId) => { const { error } = await detacherPrestataire(linkId); notify(error ? "Échec : " + error.message : "Prestataire détaché du projet"); }}
            onAjouterTache={() => setEditingTache({ projetId: detail.id, prestataireId: prestatairesDe(detail.id)[0]?.prestataireId || "", titre: "", description: "", statut: "À faire", echeance: "" })}
            onModifierTache={(t) => setEditingTache({ ...t })}
            onSupprimerTache={async (t) => { const { error } = await deleteTache(t.id); notify(error ? "Suppression refusée : " + error.message : "Tâche supprimée"); }}
            onChangerStatutTache={async (t, statut) => { const { error } = await saveTache({ ...t, statut }); notify(error ? "Échec : " + error.message : "Statut de la tâche mis à jour"); }}
          />
        </Modal>
      )}

      {fichierEnPreview && (
        <FichierApercu fichier={fichierEnPreview} onClose={() => setFichierEnPreview(null)} notify={notify} />
      )}

      {deleting && (
        <Modal title={`Supprimer "${deleting.nom}" ?`} onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Le projet sera supprimé. Les devis et factures déjà liés <b>ne sont pas supprimés</b> —
            ils redeviennent simplement non rattachés à un projet.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="danger" onClick={confirmerSuppression}>Oui, supprimer le projet</Btn>
            <Btn variant="ghost" onClick={() => setDeleting(null)}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {editingTache && (
        <Modal title={editingTache.id ? "Modifier la tâche" : "Nouvelle tâche"} onClose={() => setEditingTache(null)}>
          <TacheProjetForm data={editingTache} prestatairesLies={prestatairesDe(detail?.id || editingTache.projetId)} prestataireDe={prestataireDe} onSave={async (form) => {
            if (!form.prestataireId) { notify("Choisissez un prestataire pour cette tâche."); return { error: new Error("prestataire") }; }
            if (!form.titre.trim()) { notify("Le titre de la tâche est requis."); return { error: new Error("titre") }; }
            const { error } = await saveTache(form);
            notify(error ? "Échec : " + error.message : (form.id ? "Tâche mise à jour" : "Tâche ajoutée"));
            if (!error) setEditingTache(null);
            return { error };
          }} />
        </Modal>
      )}
    </div>
  );
}

function ProjetForm({ data, clients, onSave }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <Field label="Nom du projet"><input style={inputStyle} value={form.nom} onChange={set("nom")} placeholder="Ex. Refonte identité visuelle" /></Field>
      <Field label="Client (optionnel)">
        <Select value={form.clientId || ""} onChange={set("clientId")}>
          <option value="">— Aucun client —</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.societe} — {c.nom}</option>)}
        </Select>
      </Field>
      <Field label="Description"><textarea style={{ ...inputStyle, height: "auto", minHeight: 80, padding: "10px 12px" }} value={form.description} onChange={set("description")} /></Field>
      <Btn variant="gold" onClick={() => onSave(form)}>Enregistrer</Btn>
    </div>
  );
}

function ProjetDetail({
  projet, client, devisLies, facturesLiees, montantEncaisse,
  devisDisponibles, facturesDisponibles, clients,
  prestatairesLies, prestatairesDisponibles, prestataireDe,
  taches, fichiers = [],
  canManage, canDelete, onChangerStatut, onModifier, onSupprimer,
  onLierDevis, onDetacherDevis, onLierFacture, onDetacherFacture,
  onAffecterPrestataire, onDetacherPrestataire,
  onAjouterTache, onModifierTache, onSupprimerTache, onChangerStatutTache,
  onUploaderFichier, onSupprimerFichier, onTelechargerFichier, onFichierApercu,
}) {
  const [linkingDevis, setLinkingDevis] = useState(false);
  const [linkingFacture, setLinkingFacture] = useState(false);
  const [selectingPrestataire, setSelectingPrestataire] = useState(false);
  const [prestataireId, setPrestataireId] = useState("");
  const [mission, setMission] = useState("");
  const [ajoutFichierOuvert, setAjoutFichierOuvert] = useState(false);
  const cli = (id) => clients.find((c) => c.id === id);
  const toutesFacturesPayees = facturesLiees.length > 0 && facturesLiees.every((f) => f.statut === "Payée");
  const nbTerminees = taches.filter((t) => t.statut === "Terminée").length;
  const avancement = taches.length > 0 ? Math.round((nbTerminees / taches.length) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          {client && <div style={{ fontSize: 12.5, color: T.inkSoft }}>{client.societe} · {client.nom}</div>}
          {projet.description && <p style={{ fontSize: 13, color: T.inkSoft, marginTop: 6 }}>{projet.description}</p>}
        </div>
        {canManage && <Btn variant="ghost" small icon={Pencil} onClick={onModifier}>Modifier</Btn>}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>Statut</div>
        {canManage ? (
          <Select wrapperStyle={{ width: 180 }} value={projet.statut} onChange={(e) => onChangerStatut(e.target.value)}>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        ) : (
          <span style={{ fontSize: 13, color: STATUT_TONE[projet.statut] }}>{projet.statut}</span>
        )}
        {toutesFacturesPayees && projet.statut !== "Terminé" && (
          <span style={{ fontSize: 11.5, color: T.teal }}>✓ Toutes les factures liées sont payées</span>
        )}
      </div>

      <Card style={{ padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 6 }}>Montant encaissé sur ce projet</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, color: T.teal, fontWeight: 600 }}>{fmt(montantEncaisse)}</div>
      </Card>

      {/* Prestataires */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5 }}>Prestataires ({prestatairesLies.length})</div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManage && prestatairesLies.length > 0 && <Btn variant="ghost" small icon={ListTodo} onClick={onAjouterTache}>Ajouter une tâche</Btn>}
          {canManage && prestatairesDisponibles.length > 0 && <Btn variant="ghost" small icon={Link2} onClick={() => setSelectingPrestataire(!selectingPrestataire)}>Affecter un prestataire</Btn>}
        </div>
      </div>
      {selectingPrestataire && (
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, marginBottom: 16, background: T.bg }}>
          <Select value={prestataireId} onChange={(e) => setPrestataireId(e.target.value)}>
            <option value="">— Choisir un prestataire —</option>
            {prestatairesDisponibles.map((p) => <option key={p.id} value={p.id}>{p.nom}{p.societe ? ` — ${p.societe}` : ""}</option>)}
          </Select>
          <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Mission confiée (ex. Développement du site web)" value={mission} onChange={(e) => setMission(e.target.value)} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <Btn variant="ghost" small onClick={() => { setSelectingPrestataire(false); setPrestataireId(""); setMission(""); }}>Annuler</Btn>
            <Btn small disabled={!prestataireId} onClick={async () => { const res = await onAffecterPrestataire(prestataireId, mission); if (res?.error) return; setSelectingPrestataire(false); setPrestataireId(""); setMission(""); }}>Affecter</Btn>
          </div>
        </div>
      )}
      {prestatairesLies.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 16 }}>Aucun prestataire affecté à ce projet.</div>}
      {prestatairesLies.map((l) => {
        const p = prestataireDe(l.prestataireId);
        const tachesDuPrestataire = taches.filter((t) => t.prestataireId === l.prestataireId);
        const nbFaites = tachesDuPrestataire.filter((t) => t.statut === "Terminée").length;
        return (
          <div key={l.id} style={{ borderBottom: `1px solid ${T.line}`, padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{p?.nom || "Prestataire supprimé"}</span>
                {p && (
                  <span style={{ fontSize: 11, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 0.4 }}>{p.typeProjet}</span>
                )}
                {l.mission && <span style={{ color: T.inkSoft }}>{l.mission}</span>}
                {tachesDuPrestataire.length > 0 && (
                  <span style={{ fontSize: 11, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{nbFaites}/{tachesDuPrestataire.length} tâches</span>
                )}
              </div>
              {canManage && <button onClick={() => onDetacherPrestataire(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex" }}><X size={15} /></button>}
            </div>
            {tachesDuPrestataire.length > 0 && (
              <div style={{ marginTop: 6, marginLeft: 6 }}>
                {tachesDuPrestataire.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px dashed ${T.line}`, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12.5, flexWrap: "wrap", cursor: "pointer" }} onClick={() => onModifierTache(t)}>
                      <span style={{ fontWeight: 500 }}>{t.titre}</span>
                      {canManage ? (
                        <Select wrapperStyle={{ width: 130 }} value={t.statut} onChange={(e) => onChangerStatutTache(t, e.target.value)}>
                          {STATUTS_TACHE.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                      ) : (
                        <Badge statut={t.statut} />
                      )}
                      {t.echeance && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.inkSoft, fontSize: 11.5 }}>
                          <CalendarClock size={12} />{formatDate(t.echeance)}
                        </span>
                      )}
                      <TacheAlerteBadge tache={t} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {canManage && <button onClick={() => onModifierTache(t)} title="Modifier la tâche" style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, display: "flex" }}><Pencil size={13} /></button>}
                      {canDelete && <button onClick={() => onSupprimerTache(t)} title="Supprimer la tâche" style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex" }}><Trash2 size={13} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {taches.length > 0 && (
        <Card style={{ padding: "12px 16px", marginTop: 16, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600 }}>Avancement des tâches</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: avancement === 100 ? T.teal : T.ink }}>{nbTerminees}/{taches.length} ({avancement}%)</div>
          </div>
          <div style={{ height: 7, background: T.bg, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${avancement}%`, background: avancement === 100 ? T.teal : T.gold, transition: "width .3s ease" }} />
          </div>
        </Card>
      )}

      {/* Fichiers mis à disposition des prestataires */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 8px" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5 }}><Paperclip size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Fichiers du projet ({fichiers.length})</div>
        {canManage && <Btn variant="ghost" small icon={Upload} onClick={() => setAjoutFichierOuvert(!ajoutFichierOuvert)}>Joindre un fichier</Btn>}
      </div>
      {ajoutFichierOuvert && (
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, marginBottom: 16, background: T.bg }}>
          <FichierUploadForm projet={projet} onUpload={onUploaderFichier} onDone={() => setAjoutFichierOuvert(false)} />
        </div>
      )}
      {fichiers.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 16 }}>Aucun fichier joint — les prestataires affectés ne reçoivent rien pour le moment.</div>}
      {fichiers.map((f) => (
        <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.line}`, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12.5, minWidth: 0, flexWrap: "wrap" }}>
            <IconeFichier mimeType={f.mimeType} />
            <a onClick={() => onFichierApercu(f)} title="Prévisualiser" style={{ color: T.ink, cursor: "pointer", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{f.nom}</a>
            <CategorieBadge categorie={f.categorie} />
            <span style={{ fontSize: 11, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{formatTaille(f.tailleOctets)}</span>
            <span style={{ fontSize: 11, color: T.inkSoft }}>{formatHorodatage(f.createdAt)}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Btn variant="ghost" small icon={Download} onClick={() => onTelechargerFichier(f)}>Télécharger</Btn>
            {canDelete && <button onClick={() => onSupprimerFichier(f)} title="Supprimer le fichier" style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex", padding: 4 }}><Trash2 size={14} /></button>}
          </div>
        </div>
      ))}

      {/* Devis liés */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5 }}>Devis liés</div>
        {canManage && <Btn variant="ghost" small icon={Link2} onClick={() => setLinkingDevis(!linkingDevis)}>Lier un devis existant</Btn>}
      </div>
      {linkingDevis && (
        <DocumentPicker items={devisDisponibles} cli={cli}
          onPick={async (d) => { await onLierDevis(d); setLinkingDevis(false); }}
          onClose={() => setLinkingDevis(false)} />
      )}
      {devisLies.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 16 }}>Aucun devis lié</div>}
      {devisLies.map((d) => (
        <div key={d.uuid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{d.id}</span>
            <span style={{ color: T.inkSoft }}>{cli(d.clientId)?.societe}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(totals(d.lignes).ttc)}</span>
            <Badge statut={d.statut} />
          </div>
          {canManage && <button onClick={() => onDetacherDevis(d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex" }}><X size={15} /></button>}
        </div>
      ))}

      {/* Factures liées */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 8px" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5 }}>Factures liées</div>
        {canManage && <Btn variant="ghost" small icon={Link2} onClick={() => setLinkingFacture(!linkingFacture)}>Lier une facture existante</Btn>}
      </div>
      {linkingFacture && (
        <DocumentPicker items={facturesDisponibles} cli={cli}
          onPick={async (f) => { await onLierFacture(f); setLinkingFacture(false); }}
          onClose={() => setLinkingFacture(false)} />
      )}
      {facturesLiees.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 16 }}>Aucune facture liée</div>}
      {facturesLiees.map((f) => (
        <div key={f.uuid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{f.id}</span>
            <span style={{ color: T.inkSoft }}>{cli(f.clientId)?.societe}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(totals(f.lignes).ttc)}</span>
            <Badge statut={f.statut} />
          </div>
          {canManage && <button onClick={() => onDetacherFacture(f)} style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex" }}><X size={15} /></button>}
        </div>
      ))}

      {canDelete && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.line}` }}>
          <Btn variant="danger" small icon={Trash2} onClick={onSupprimer}>Supprimer ce projet</Btn>
        </div>
      )}
    </div>
  );
}

function DocumentPicker({ items, cli, onPick, onClose }) {
  const [q, setQ] = useState("");
  const filtered = items.filter((it) => (it.id + (cli(it.clientId)?.societe || "")).toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: 12, marginBottom: 16, background: T.bg }}>
      <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Rechercher par numéro ou client…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {filtered.length === 0 && <div style={{ fontSize: 12, color: T.inkSoft, padding: "8px 4px" }}>Aucun résultat, ou déjà tous rattachés à un autre projet.</div>}
        {filtered.map((it) => (
          <div key={it.uuid} onClick={() => onPick(it)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px", cursor: "pointer", borderRadius: 6, fontSize: 12.5 }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#fff")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{it.id}</span>
            <span style={{ color: T.inkSoft }}>{cli(it.clientId)?.societe}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(totals(it.lignes).ttc)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, textAlign: "right" }}>
        <Btn variant="ghost" small onClick={onClose}>Fermer</Btn>
      </div>
    </div>
  );
}

function FichierUploadForm({ projet, onUpload, onDone }) {
  const [categorie, setCategorie] = useState("Autre");
  const [choisis, setChoisis] = useState([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef();

  const envoyer = async () => {
    setBusy(true);
    for (const file of choisis) {
      const { error } = await onUpload(file, categorie);
      if (error) break;
    }
    setBusy(false);
    onDone();
  };

  return (
    <div>
      <input ref={ref} type="file" multiple hidden onChange={(e) => setChoisis(Array.from(e.target.files || []))} />
      <button type="button" onClick={() => ref.current?.click()} style={{ width: "100%", border: `1px dashed ${T.line}`, borderRadius: 8, background: "#fff", padding: "18px 12px", cursor: "pointer", fontSize: 12.5, color: T.inkSoft, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Upload size={17} style={{ color: T.gold }} />
        <span>Cliquez pour choisir un ou plusieurs fichiers (50 Mo max. chacun)</span>
      </button>
      {choisis.length > 0 && (
        <div style={{ fontSize: 12.5, marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          {choisis.map((file, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <IconeFichier mimeType={file.type} size={13} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{file.name}</span>
              <span style={{ fontSize: 11, color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{formatTaille(file.size)}</span>
            </div>
          ))}
        </div>
      )}
      <Field label="Catégorie (type de projet associé)">
        <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
          {FICHIER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" small onClick={onDone}>Annuler</Btn>
        <Btn small disabled={!choisis.length || busy} onClick={envoyer}>{busy ? "Envoi en cours…" : "Mettre à disposition"}</Btn>
      </div>
    </div>
  );
}

function TacheProjetForm({ data, prestatairesLies, prestataireDe, onSave }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <Field label="Titre de la tâche *"><input style={inputStyle} value={form.titre} onChange={set("titre")} placeholder="Ex. Conception des maquettes" /></Field>
      <Field label="Prestataire">
        <Select value={form.prestataireId || ""} onChange={set("prestataireId")}>
          <option value="">— Choisir un prestataire —</option>
          {prestatairesLies.map((l) => <option key={l.prestataireId} value={l.prestataireId}>{prestataireDe(l.prestataireId)?.nom || "Prestataire supprimé"}</option>)}
        </Select>
      </Field>
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
