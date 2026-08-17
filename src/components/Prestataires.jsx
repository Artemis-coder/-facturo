import React, { useState } from "react";
import {
  Handshake, Users, UserCheck, ClipboardList, FileSignature,
  Plus, Pencil, Trash2, X, Mail, Phone, Building2, Link2, FolderKanban,
} from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { TableShell, Btn, Modal, Field, Select, Badge, Card, EmptyState, KpiBar } from "./ui";

export const TYPES_PROJET = ["Design graphique", "Développement web", "Audiovisuel", "Marketing", "Rédaction", "Autre"];
export const TYPES_CONTRAT = ["Prestation de service", "Sous-traitance", "Freelance", "Partenariat"];

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

export function Prestataires({ projets, prestataires, liens, onSavePrestataire, onDeletePrestataire, affecterPrestataire, detacherPrestataire, notify, canManage = true, canDelete = false }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const projetDe = (id) => projets.find((p) => p.id === id);
  const liensDe = (prestataireId) => liens.filter((l) => l.prestataireId === prestataireId);

  const list = prestataires.filter((p) => (p.nom + (p.societe || "") + (p.typeProjet || "")).toLowerCase().includes(q.toLowerCase()));

  const totalPrestataires = prestataires.length;
  const idsActifs = new Set(liens.filter((l) => projetDe(l.projetId)?.statut === "En cours").map((l) => l.prestataireId));
  const actifsCount = idsActifs.size;
  const missionsEnCours = liens.filter((l) => projetDe(l.projetId)?.statut === "En cours").length;
  const contratsCount = {};
  prestataires.forEach((p) => { contratsCount[p.typeContrat] = (contratsCount[p.typeContrat] || 0) + 1; });
  const typeContratDominant = Object.entries(contratsCount).sort((a, b) => b[1] - a[1])[0];

  const kpis = [
    { label: "Total Prestataires", value: `${totalPrestataires}`, sub: "Partenaires enregistrés", tone: T.ink, icon: Users },
    { label: "Prestataires Actifs", value: `${actifsCount}`, sub: "Sur un projet en cours", tone: T.gold, icon: UserCheck },
    { label: "Missions en Cours", value: `${missionsEnCours}`, sub: "Affectations actives", tone: T.teal, icon: ClipboardList },
    { label: "Type de Contrat Dominant", value: typeContratDominant ? `${typeContratDominant[0]}` : "—", sub: typeContratDominant ? `${typeContratDominant[1]} contrat${typeContratDominant[1] > 1 ? "s" : ""}` : "Aucun contrat", tone: T.slate, icon: FileSignature },
  ];

  const save = async (form) => {
    if (!form.nom.trim()) return notify("Le nom du prestataire est requis.");
    const { error } = await onSavePrestataire(form);
    notify(error ? "Échec : " + error.message : (form.id ? "Prestataire mis à jour" : "Prestataire créé"));
    if (!error) setEditing(null);
  };

  const confirmerSuppression = async () => {
    const { error } = await onDeletePrestataire(deleting.id);
    notify(error ? "Suppression refusée : " + error.message : "Prestataire supprimé (ses affectations ont été retirées des projets)");
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

  return (
    <div>
      <KpiBar items={kpis} />
      <TableShell headers={["Nom", "Société", "Type de projet", "Type de contrat", "Projets", ""]} onSearch={setQ}
        searchPlaceholder="Rechercher un prestataire…"
        action={canManage && <Btn icon={Plus} onClick={() => setEditing({ nom: "", societe: "", email: "", tel: "", notes: "", typeProjet: TYPES_PROJET[0], typeContrat: TYPES_CONTRAT[0] })}>Nouveau prestataire</Btn>}>
        {list.length === 0 && (
          <tr><td colSpan={6}><EmptyState icon={Handshake} title="Aucun prestataire" subtitle="Ajoutez les partenaires à qui vous confiez une partie de vos projets." /></td></tr>
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
            canManage={canManage} canDelete={canDelete}
            onModifier={() => { setEditing(detail); setDetail(null); }}
            onSupprimer={() => setDeleting(detail)}
            onAffecter={affecter}
            onDetacher={detacher}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title={`Supprimer "${deleting.nom}" ?`} onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Le prestataire sera supprimé. Ses affectations aux projets seront <b>retirées</b>,
            mais les projets eux-mêmes restent intacts.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="danger" onClick={confirmerSuppression}>Oui, supprimer le prestataire</Btn>
            <Btn variant="ghost" onClick={() => setDeleting(null)}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
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

function PrestataireDetail({ prestataire, projetsLies, projetDe, projetsDisponibles, canManage, canDelete, onModifier, onSupprimer, onAffecter, onDetacher }) {
  const [projetId, setProjetId] = useState("");
  const [mission, setMission] = useState("");

  const validerAffectation = async () => {
    if (!projetId) return;
    await onAffecter({ projetId, mission });
    setProjetId("");
    setMission("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          {prestataire.societe && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: T.inkSoft, marginBottom: 6 }}>
              <Building2 size={14} />{prestataire.societe}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <TypeBadge label={prestataire.typeProjet} tone={TYPE_PROJET_TONE[prestataire.typeProjet]} />
            <TypeBadge label={prestataire.typeContrat} tone={TYPE_CONTRAT_TONE[prestataire.typeContrat]} />
          </div>
        </div>
        {canManage && <Btn variant="ghost" small icon={Pencil} onClick={onModifier}>Modifier</Btn>}
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5 }}>Projets attribués ({projetsLies.length})</div>
      </div>

      {projetsLies.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 16 }}>Aucun projet attribué pour le moment.</div>}
      {projetsLies.map((l) => {
        const pr = projetDe(l.projetId);
        return (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}><FolderKanban size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />{pr?.nom || "Projet supprimé"}</span>
              {pr && <Badge statut={pr.statut} />}
              {l.mission && <span style={{ color: T.inkSoft }}>{l.mission}</span>}
            </div>
            {canManage && (
              <button onClick={() => onDetacher(l.id)} title="Détacher du projet" style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, display: "flex", flexShrink: 0 }}>
                <X size={15} />
              </button>
            )}
          </div>
        );
      })}

      {canManage && projetsDisponibles.length > 0 && (
        <div style={{ marginTop: 18, padding: 14, border: `1px solid ${T.line}`, borderRadius: 10, background: T.bg }}>
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

      {canDelete && (
        <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
          <Btn variant="danger" small icon={Trash2} onClick={onSupprimer}>Supprimer ce prestataire</Btn>
        </div>
      )}
    </div>
  );
}
