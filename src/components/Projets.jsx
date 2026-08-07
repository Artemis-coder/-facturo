import React, { useState } from "react";
import { Plus, Pencil, FolderKanban, Link2, X, Trash2 } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals, montantEncaisseTotal } from "../lib/helpers";
import { TableShell, Btn, Modal, Field, Select, Badge, Card, EmptyState } from "./ui";

const STATUTS = ["En cours", "Terminé", "Annulé"];
const STATUT_TONE = { "En cours": T.slate, "Terminé": T.teal, "Annulé": T.brick };

export function Projets({ projets, clients, devis, factures, saveProjet, changerStatut, deleteProjet, lierDevis, lierFacture, notify, canManage = true, canDelete = false }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const cli = (id) => clients.find((c) => c.id === id);
  const devisDe = (projetId) => devis.filter((d) => d.projetId === projetId);
  const facturesDe = (projetId) => factures.filter((f) => f.projetId === projetId);
  const montantEncaisseDe = (projetId) => montantEncaisseTotal(facturesDe(projetId));

  const list = projets.filter((p) => (p.nom + (cli(p.clientId)?.societe || "")).toLowerCase().includes(q.toLowerCase()));

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

  return (
    <div>
      <TableShell headers={["Nom", "Client", "Statut", "Devis liés", "Factures liées", "Encaissé", ""]} onSearch={setQ}
        searchPlaceholder="Rechercher un projet…"
        action={canManage && <Btn icon={Plus} onClick={() => setEditing({ nom: "", description: "", clientId: "" })}>Nouveau projet</Btn>}>
        {list.length === 0 && (
          <tr><td colSpan={7}><EmptyState icon={FolderKanban} title="Aucun projet" subtitle="Regroupez vos devis et factures par projet pour un meilleur suivi." /></td></tr>
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
            canManage={canManage} canDelete={canDelete}
            onChangerStatut={(s) => changer(detail.id, s)}
            onModifier={() => { setEditing(detail); setDetail(null); }}
            onSupprimer={() => setDeleting(detail)}
            onLierDevis={async (d) => { await lierDevis(d, detail.id); notify("Devis rattaché au projet"); }}
            onDetacherDevis={async (d) => { await lierDevis(d, null); notify("Devis détaché du projet"); }}
            onLierFacture={async (f) => { await lierFacture(f, detail.id); notify("Facture rattachée au projet"); }}
            onDetacherFacture={async (f) => { await lierFacture(f, null); notify("Facture détachée du projet"); }}
          />
        </Modal>
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
  canManage, canDelete, onChangerStatut, onModifier, onSupprimer,
  onLierDevis, onDetacherDevis, onLierFacture, onDetacherFacture,
}) {
  const [linkingDevis, setLinkingDevis] = useState(false);
  const [linkingFacture, setLinkingFacture] = useState(false);
  const cli = (id) => clients.find((c) => c.id === id);
  const toutesFacturesPayees = facturesLiees.length > 0 && facturesLiees.every((f) => f.statut === "Payée");

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
