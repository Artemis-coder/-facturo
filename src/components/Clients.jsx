import React, { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals } from "../lib/helpers";
import { TableShell, Btn, Modal, Field, Badge } from "./ui";

export function Clients({ clients, onSaveClient, devis, factures, notify, canEdit = true }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const list = clients.filter((c) => (c.nom + c.societe).toLowerCase().includes(q.toLowerCase()));

  const save = async (form) => {
    await onSaveClient(form);
    notify(form.id ? "Client mis à jour" : "Client ajouté");
    setEditing(null);
  };

  return (
    <div>
      <TableShell headers={["Nom", "Société", "Email", "Téléphone", "Ville", ""]} onSearch={setQ}
        searchPlaceholder="Rechercher un client…"
        action={canEdit && <Btn icon={Plus} onClick={() => setEditing({ nom: "", societe: "", email: "", tel: "", ville: "", notes: "" })}>Nouveau client</Btn>}>
        {list.map((c) => (
          <tr key={c.id}>
            <td style={td}><a style={{ color: T.ink, cursor: "pointer", fontWeight: 600 }} onClick={() => setDetail(c)}>{c.nom}</a></td>
            <td style={td}>{c.societe}</td>
            <td style={td}>{c.email}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{c.tel}</td>
            <td style={td}>{c.ville}</td>
            <td style={{ ...td, textAlign: "right" }}>
              {canEdit && <Btn variant="ghost" small icon={Pencil} onClick={() => setEditing(c)}>Modifier</Btn>}
            </td>
          </tr>
        ))}
      </TableShell>

      {editing && (
        <Modal title={editing.id ? "Modifier le client" : "Nouveau client"} onClose={() => setEditing(null)}>
          <ClientForm data={editing} onSave={save} />
        </Modal>
      )}

      {detail && (
        <Modal title={detail.nom} onClose={() => setDetail(null)} wide>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 24, fontSize: 13, color: T.inkSoft, flexWrap: "wrap" }}>
              <div>{detail.societe}</div><div>{detail.email}</div><div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{detail.tel}</div>
            </div>
            {canEdit && (
              <Btn variant="ghost" small icon={Pencil} onClick={() => { setEditing(detail); setDetail(null); }}>Modifier</Btn>
            )}
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, marginBottom: 8 }}>Devis</div>
          {devis.filter((d) => d.clientId === detail.id).map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12.5 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{d.id}</span><span>{fmt(totals(d.lignes).ttc)}</span><Badge statut={d.statut} />
            </div>
          ))}
          {devis.filter((d) => d.clientId === detail.id).length === 0 && (
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun devis</div>
          )}
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, margin: "16px 0 8px" }}>Factures</div>
          {factures.filter((f) => f.clientId === detail.id).map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.line}`, fontSize: 12.5 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{f.id}</span><span>{fmt(totals(f.lignes).ttc)}</span><Badge statut={f.statut} />
            </div>
          ))}
          {factures.filter((f) => f.clientId === detail.id).length === 0 && (
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucune facture</div>
          )}
        </Modal>
      )}
    </div>
  );
}

function ClientForm({ data, onSave }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Nom du contact"><input style={inputStyle} value={form.nom} onChange={set("nom")} /></Field>
        <Field label="Société"><input style={inputStyle} value={form.societe} onChange={set("societe")} /></Field>
        <Field label="Email"><input style={inputStyle} value={form.email} onChange={set("email")} /></Field>
        <Field label="Téléphone"><input style={inputStyle} value={form.tel} onChange={set("tel")} /></Field>
        <Field label="Ville"><input style={inputStyle} value={form.ville} onChange={set("ville")} /></Field>
      </div>
      <Field label="Notes"><textarea style={{ ...inputStyle, height: "auto", minHeight: 70, padding: "10px 12px" }} value={form.notes} onChange={set("notes")} /></Field>
      <Btn variant="gold" onClick={() => onSave(form)}>Enregistrer</Btn>
    </div>
  );
}
