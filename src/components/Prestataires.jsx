import React, { useState } from "react";
import {
  Handshake, Users, UserCheck, ClipboardList, FileSignature,
  Plus, Pencil, Trash2, X, Mail, Phone, Building2, Link2, FolderKanban,
  MailPlus, Check, Copy, MessageCircle, AlertTriangle, CalendarClock,
} from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { alerteTache, SEUIL_ALERTE_JOURS } from "../lib/helpers";
import { TableShell, Btn, Modal, Field, Select, Badge, Card, EmptyState, KpiBar } from "./ui";
import { SITE_URL } from "../lib/siteUrl";

export const TYPES_PROJET = ["Design graphique", "Développement web", "Audiovisuel", "Marketing", "Rédaction", "Autre"];
export const TYPES_CONTRAT = ["Prestation de service", "Sous-traitance", "Freelance", "Partenariat"];
export const STATUTS_TACHE = ["À faire", "En cours", "Terminée"];

const APP_URL = SITE_URL;

const TYPE_PROJET_TONE = {
  "Design graphique": T.gold,
  "Développement web": T.teal,
  "Audiovisuel": T.brick,
  "Marketing": T.slate,
  "Rédaction": T.ink,
  "Autre": T.inkSoft,
};
const TYPE_CONTRAT_TONE = {
  "Prestation de service": T.teal,
  "Sous-traitance": T.gold,
  "Freelance": T.slate,
  "Partenariat": T.brick,
};

function TypeBadge({ label, tone }) {
  const c = tone || T.slate;
  return (
    <span style={{
      background: `${c}1A`, color: c, fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", padding: "3px 8px",
      borderRadius: 20, border: `1px solid ${c}33`, whiteSpace: "nowrap", fontWeight: 600,
    }}>{label}</span>
  );
}

export function badgeAlerte(alr) {
  if (!alr) return null;
  if (alr.level === "retard") return <Badge statut="En retard" />;
  return (
    <span style={{
      background: T.goldSoft, color: T.gold, fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", padding: "3px 8px",
      borderRadius: 20, border: `1px solid ${T.gold}33`, whiteSpace: "nowrap", fontWeight: 600,
    }}>{alr.jours === 0 ? "Aujourd'hui" : `J-${alr.jours}`}</span>
  );
}

const formatDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR") : "—");

export function Prestataires({ projets, prestataires, liens, taches = [], contrats = [], onSavePrestataire, onDeletePrestataire, affecterPrestataire, detacherPrestataire, onSaveTache, onDeleteTache, inviterPrestataire, notify, canManage = true, canDelete = false }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [invitationResultat, setInvitationResultat] = useState(null);

  const projetDe = (id) => projets.find((p) => p.id === id);
  const liensDe = (prestataireId) => liens.filter((l) => l.prestataireId === prestataireId);
  const tachesDe = (prestataireId) => taches.filter((t) => t.prestataireId === prestataireId);
  const contratsDe = (prestataireId) => contrats.filter((c) => c.prestataireId === prestataireId);

  const list = prestataires.filter((p) => (p.nom + (p.societe || "") + (p.typeProjet || "")).toLowerCase().includes(q.toLowerCase()));

  const totalPrestataires = prestataires.length;
  const idsActifs = new Set(liens.filter((l) => projetDe(l.projetId)?.statut === "En cours").map((l) => l.prestataireId));
  const actifsCount = idsActifs.size;
  const missionsEnCours = liens.filter((l) => projetDe(l.projetId)?.statut === "En cours").length;
  const comptesLies = prestataires.filter((p) => p.userId).length;
  const tachesEnAlerte = taches.filter((t) => alerteTache(t)).length;

  const kpis = [
    { label: "Total Prestataires", value: `${totalPrestataires}`, sub: "Partenaires enregistrés", tone: T.ink, icon: Users },
    { label: "Prestataires Actifs", value: `${actifsCount}`, sub: "Sur un projet en cours", tone: T.gold, icon: UserCheck },
    { label: "Missions en Cours", value: `${missionsEnCours}`, sub: `${tachesEnAlerte} tâche${tachesEnAlerte > 1 ? "s" : ""} en alerte`, tone: T.teal, icon: ClipboardList },
    { label: "Comptes connectés", value: `${comptesLies}`, sub: "Avec accès à leur espace", tone: T.slate, icon: UserCheck },
  ];

  const save = async (form) => {
    if (!form.nom.trim()) return notify("Le nom du prestataire est requis.");
    const { error } = await onSavePrestataire(form);
    notify(error ? "Échec : " + error.message : (form.id ? "Prestataire mis à jour" : "Prestataire créé"));
    if (!error) setEditing(null);
  };

  const confirmerSuppression = async () => {
    const { error } = await onDeletePrestataire(deleting.id);
    notify(error ? "Suppression refusée : " + error.message : "Prestataire supprimé (ses affectations et tâches ont été retirées des projets)");
    setDeleting(null);
    setDetail(null);
  };

  const affecter = async ({ projetId, mission }) => {
    const { error } = await affecterPrestataire({ projetId, prestataireId: detail.id, mission });
    notify(error ? "Échec : " + error.message : "Prestataire affecté au projet");
  };

  const detacher = async (linkId) => {
    const { error } = await detacherPrestataire(linkId);
    notify(error ? "Échec : " + error.message : "Prestataire détaché du projet");
  };

  const inviter = async (prestataire) => {
    if (!prestataire.email) return notify("Renseignez d'abord l'e-mail du prestataire (bouton Modifier).");
    const { error, emailError } = await inviterPrestataire(prestataire);
    if (error) {
      notify(error.code === "23505" ? "Une invitation est déjà en attente pour cette adresse." : "Erreur : " + error.message);
      return;
    }
    setInvitationResultat({ prestataire, emailError });
  };

  const saveTacheHandler = async (form) => {
    if (!form.titre.trim()) return notify("Le titre de la tâche est requis.");
    if (!form.projetId) return notify("Choisissez un projet pour cette tâche.");
    const { error } = await onSaveTache(form);
    notify(error ? "Échec : " + error.message : (form.id ? "Tâche mise à jour" : "Tâche ajoutée"));
    return { error };
  };

  const deleteTacheHandler = async (id) => {
    const { error } = await onDeleteTache(id);
    notify(error ? "Suppression refusée : " + error.message : "Tâche supprimée");
  };

  return (
    <div>
      <KpiBar items={kpis} />
      <TableShell headers={["Nom", "Société", "Type de projet", "Type de contrat", "Projets", "Compte", ""]} onSearch={setQ}
        searchPlaceholder="Rechercher un prestataire…"
        action={canManage && <Btn icon={Plus} onClick={() => setEditing({ nom: "", societe: "", email: "", tel: "", notes: "", typeProjet: TYPES_PROJET[0], typeContrat: TYPES_CONTRAT[0] })}>Nouveau prestataire</Btn>}>
        {list.length === 0 && (
          <tr><td colSpan={7}><EmptyState icon={Handshake} title="Aucun prestataire" subtitle="Ajoutez les partenaires à qui vous confiez une partie de vos projets." /></td></tr>
        )}
        {list.map((p) => (
          <tr key={p.id}>
            <td style={{ ...td, fontWeight: 600 }}>
              <a style={{ color: T.ink, cursor: "pointer" }} onClick={() => setDetail(p)}>{p.nom}</a>
            </td>
            <td style={td}>{p.societe || "—"}</td>
            <td style={td}><TypeBadge label={p.typeProjet} tone={TYPE_PROJET_TONE[p.typeProjet]} /></td>
            <td style={td}><TypeBadge label={p.typeContrat} tone={TYPE_CONTRAT_TONE[p.typeContrat]} /></td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{liensDe(p.id).length}</td>
            <td style={td}>{p.userId ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.teal, fontWeight: 600 }}>
                <UserCheck size={13} />Lié
              </span>
            ) : <span style={{ fontSize: 11.5, color: T.inkSoft }}>—</span>}</td>
            <td style={{ ...td, textAlign: "right" }}>
              {canManage && <Btn variant="ghost" small icon={Pencil} onClick={() => setEditing(p)}>Modifier</Btn>}{" "}
              <Btn variant="ghost" small onClick={() => setDetail(p)}>Voir</Btn>
            </td>
          </tr>
        ))}
      </TableShell>

      {editing && (
        <Modal title={editing.id ? "Modifier le prestataire" : "Nouveau prestataire"} onClose={() => setEditing(null)}>
          <PrestataireForm data={editing} onSave={save} />
        </Modal>
      )}

      {detail && (
        <Modal title={detail.nom} onClose={() => setDetail(null)} wide>
          <PrestataireDetail
            prestataire={detail}
            projetsLies={liensDe(detail.id)}
            projetDe={projetDe}
            projetsDisponibles={projets.filter((pr) => !liensDe(detail.id).some((l) => l.projetId === pr.id))}
            contratsLies={contratsDe(detail.id)}
            tachesLies={tachesDe(detail.id)}
            canManage={canManage} canDelete={canDelete}
            onModifier={() => { setEditing(detail); setDetail(null); }}
            onSupprimer={() => setDeleting(detail)}
            onAffecter={affecter}
            onDetacher={detacher}
            onInviter={() => inviter(detail)}
            onSaveTache={saveTacheHandler}
            onDeleteTache={deleteTacheHandler}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title={`Supprimer "${deleting.nom}" ?`} onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Le prestataire sera supprimé. Ses affectations aux projets et ses tâches seront <b>retirées</b>,
            les projets et contrats restent intacts. Si un compte de connexion était lié, il restera actif
            mais sans fiche prestataire (portail vide).
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="danger" onClick={confirmerSuppression}>Oui, supprimer le prestataire</Btn>
            <Btn variant="ghost" onClick={() => setDeleting(null)}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {invitationResultat && (
        <Modal title="Invitation envoyée" onClose={() => setInvitationResultat(null)}>
          {invitationResultat.emailError ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.brickSoft, color: T.brick, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 16 }}>
              <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              L'e-mail n'a pas pu être envoyé automatiquement ({invitationResultat.emailError.message}). L'invitation est bien créée —
              réessayez plus tard depuis la fiche du prestataire, ou partagez le message ci-dessous manuellement.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.tealSoft, color: T.teal, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, marginBottom: 16 }}>
              <Check size={14} /> E-mail envoyé à {invitationResultat.prestataire.email} — le prestataire pourra se connecter en cliquant sur le lien reçu.
            </div>
          )}
          <p style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 8 }}>En secours, vous pouvez aussi partager ce message vous-même :</p>
          <textarea readOnly value={buildMessagePrestataire(invitationResultat.prestataire)}
            style={{ ...inputStyle, height: "auto", minHeight: 140, padding: "10px 12px", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="ghost" icon={Copy} onClick={() => copierMessage(buildMessagePrestataire(invitationResultat.prestataire), notify)}>Copier le message</Btn>
            <a href={`https://wa.me/?text=${encodeURIComponent(buildMessagePrestataire(invitationResultat.prestataire))}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Btn variant="ghost" icon={MessageCircle}>Envoyer via WhatsApp</Btn>
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

function buildMessagePrestataire(prestataire) {
  return (
    `Bonjour ${prestataire.nom} !\n\n` +
    `Un espace prestataire vous a été ouvert sur Ma Bouate : vous pourrez suivre vos projets, ` +
    `consulter vos contrats et gérer vos tâches.\n\n` +
    `Un e-mail avec un lien de connexion vient de vous être envoyé à ${prestataire.email} — ` +
    `cliquez dessus pour activer votre accès.\n\n` +
    `Si vous ne le recevez pas, allez sur ${APP_URL} et inscrivez-vous avec CETTE adresse e-mail précise : ${prestataire.email}.`
  );
}

async function copierMessage(texte, notify) {
  try {
    await navigator.clipboard.writeText(texte);
    notify("Message copié — collez-le dans WhatsApp, SMS ou e-mail");
  } catch {
    notify("Impossible de copier automatiquement — sélectionnez le texte manuellement");
  }
}

function PrestataireForm({ data, onSave }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <Field label="Nom du prestataire *"><input style={inputStyle} value={form.nom} onChange={set("nom")} placeholder="Ex. Awa Diop" /></Field>
      <Field label="Société / Structure"><input style={inputStyle} value={form.societe} onChange={set("societe")} placeholder="Ex. Studio Créatif SARL" /></Field>
      <Field label="E-mail"><input type="email" style={inputStyle} value={form.email} onChange={set("email")} placeholder="contact@exemple.com" /></Field>
      <Field label="Téléphone"><input style={inputStyle} value={form.tel} onChange={set("tel")} placeholder="+221 ..." /></Field>
      <Field label="Type de projet (domaine d'expertise)">
        <Select value={form.typeProjet} onChange={set("typeProjet")}>
          {TYPES_PROJET.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Type de contrat">
        <Select value={form.typeContrat} onChange={set("typeContrat")}>
          {TYPES_CONTRAT.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Notes"><textarea style={{ ...inputStyle, height: "auto", minHeight: 80, padding: "10px 12px" }} value={form.notes} onChange={set("notes")} /></Field>
      <Btn variant="gold" onClick={() => onSave(form)}>Enregistrer</Btn>
    </div>
  );
}

function PrestataireDetail({ prestataire, projetsLies, projetDe, projetsDisponibles, contratsLies, tachesLies, canManage, canDelete, onModifier, onSupprimer, onAffecter, onDetacher, onInviter, onSaveTache, onDeleteTache }) {
  const [projetId, setProjetId] = useState("");
  const [mission, setMission] = useState("");
  const [editingTache, setEditingTache] = useState(null);
  const [deletingTache, setDeletingTache] = useState(null);

  const validerAffectation = async () => {
    if (!projetId) return;
    await onAffecter({ projetId, mission });
    setProjetId("");
    setMission("");
  };

  const projetsAvecTaches = projetsLies.map((l) => ({
    lien: l,
    projet: projetDe(l.projetId),
    taches: tachesLies.filter((t) => t.projetId === l.projetId),
  }));
  const orphelines = tachesLies.filter((t) => !projetsLies.some((l) => l.projetId === t.projetId));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 10 }}>
        <div>
          {prestataire.societe && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: T.inkSoft, marginBottom: 6 }}>
              <Building2 size={14} />{prestataire.societe}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <TypeBadge label={prestataire.typeProjet} tone={TYPE_PROJET_TONE[prestataire.typeProjet]} />
            <TypeBadge label={prestataire.typeContrat} tone={TYPE_CONTRAT_TONE[prestataire.typeContrat]} />
            {prestataire.userId && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.teal, fontWeight: 600 }}>
                <UserCheck size={13} /> Compte lié
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {canManage && <Btn variant="ghost" small icon={Pencil} onClick={onModifier}>Modifier</Btn>}
          {canManage && !prestataire.userId && (
            <Btn variant="gold" small icon={MailPlus} onClick={onInviter} disabled={!prestataire.email}>
              Inviter (connexion)
            </Btn>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
        {prestataire.email && (
          <Card style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.inkSoft }}>
              <Mail size={13} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prestataire.email}</span>
            </div>
          </Card>
        )}
        {prestataire.tel && (
          <Card style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.inkSoft }}>
              <Phone size={13} />{prestataire.tel}
            </div>
          </Card>
        )}
      </div>

      {prestataire.notes && (
        <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.6, background: T.bg, padding: "10px 12px", borderRadius: 8, margin: "0 0 18px" }}>{prestataire.notes}</p>
      )}

      {/* --- Projets attribués + tâches par projet --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5 }}>Projets attribués ({projetsLies.length})</div>
        {canManage && projetsLies.length > 0 && (
          <Btn variant="ghost" small icon={Plus} onClick={() => setEditingTache({ titre: "", description: "", statut: "À faire", echeance: "", projetId: projetsLies[0].projetId, prestataireId: prestataire.id })}>
            Ajouter une tâche
          </Btn>
        )}
      </div>

      {projetsLies.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 16 }}>Aucun projet attribué pour le moment.</div>}
      {projetsAvecTaches.map(({ lien, projet, taches }) => (
        <div key={lien.id} style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}><FolderKanban size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />{projet?.nom || "Projet supprimé"}</span>
              {projet && <Badge statut={projet.statut} />}
              {lien.mission && <span style={{ color: T.inkSoft }}>{lien.mission}</span>}
            </div>
            {canManage && (
              <button onClick={() => onDetacher(lien.id)} title="Détacher du projet" style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex", flexShrink: 0 }}>
                <X size={15} />
              </button>
            )}
          </div>
          {taches.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {taches.map((t) => <TacheRow key={t.id} tache={t} onEdit={() => setEditingTache({ ...t })} onDelete={() => setDeletingTache(t)} canManage={canManage} canDelete={canDelete} />)}
            </div>
          )}
        </div>
      ))}
      {orphelines.length > 0 && orphelines.map((t) => <TacheRow key={t.id} tache={t} projetNom="Projet inconnu" onEdit={() => setEditingTache({ ...t })} onDelete={() => setDeletingTache(t)} canManage={canManage} canDelete={canDelete} />)}

      {canManage && projetsDisponibles.length > 0 && (
        <div style={{ marginBottom: 22, padding: 14, border: `1px solid ${T.line}`, borderRadius: 10, background: T.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 10 }}>
            <Link2 size={14} />Affecter à un projet
          </div>
          <Select value={projetId} onChange={(e) => setProjetId(e.target.value)}>
            <option value="">— Choisir un projet —</option>
            {projetsDisponibles.map((pr) => <option key={pr.id} value={pr.id}>{pr.nom}</option>)}
          </Select>
          <input style={{ ...inputStyle, marginTop: 8 }} value={mission} onChange={(e) => setMission(e.target.value)} placeholder="Mission confiée (ex. Conception des maquettes)" />
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <Btn small disabled={!projetId} onClick={validerAffectation}>Affecter</Btn>
          </div>
        </div>
      )}

      {/* --- Contrats --- */}
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, marginBottom: 10 }}>Contrats ({contratsLies.length})</div>
      {contratsLies.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 16 }}>Aucun contrat lié. Associez un contrat à ce prestataire depuis le module Commercial → Contrats.</div>}
      {contratsLies.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}><FileSignature size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />{c.titre}</span>
            <Badge statut={c.statut} />
            <span style={{ color: T.inkSoft }}>{formatDate(c.createdAt?.slice(0, 10))}</span>
          </div>
        </div>
      ))}

      {canDelete && (
        <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
          <Btn variant="danger" small icon={Trash2} onClick={onSupprimer}>Supprimer ce prestataire</Btn>
        </div>
      )}

      {editingTache && (
        <Modal title={editingTache.id ? "Modifier la tâche" : "Nouvelle tâche"} onClose={() => setEditingTache(null)}>
          <TacheForm data={editingTache} projetsLies={projetsLies} projetDe={projetDe} onSave={async (form) => { const { error } = await onSaveTache(form); if (!error) setEditingTache(null); return { error }; }} />
        </Modal>
      )}

      {deletingTache && (
        <Modal title={`Supprimer "${deletingTache.titre}" ?`} onClose={() => setDeletingTache(null)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>La tâche sera définitivement supprimée.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="danger" onClick={async () => { await onDeleteTache(deletingTache.id); setDeletingTache(null); }}>Oui, supprimer</Btn>
            <Btn variant="ghost" onClick={() => setDeletingTache(null)}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TacheRow({ tache, projetNom, onEdit, onDelete, canManage, canDelete }) {
  const alr = alerteTache(tache);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px dashed ${T.line}`, gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 12.5, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>{tache.titre}</span>
        {projetNom && <span style={{ color: T.inkSoft, fontSize: 11.5 }}>{projetNom}</span>}
        <Badge statut={tache.statut} />
        {tache.echeance && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.inkSoft, fontSize: 11.5 }}>
            <CalendarClock size={12} />{formatDate(tache.echeance)}
          </span>
        )}
        {badgeAlerte(alr)}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {canManage && <button onClick={onEdit} title="Modifier la tâche" style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, display: "flex" }}><Pencil size={14} /></button>}
        {canDelete && <button onClick={onDelete} title="Supprimer la tâche" style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex" }}><Trash2 size={14} /></button>}
      </div>
    </div>
  );
}

function TacheForm({ data, projetsLies, projetDe, onSave }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <Field label="Titre de la tâche *"><input style={inputStyle} value={form.titre} onChange={set("titre")} placeholder="Ex. Conception des maquettes" /></Field>
      <Field label="Projet">
        <Select value={form.projetId || ""} onChange={set("projetId")}>
          {projetsLies.map((l) => <option key={l.projetId} value={l.projetId}>{projetDe(l.projetId)?.nom || "Projet supprimé"}</option>)}
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
