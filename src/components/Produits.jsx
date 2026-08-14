import React, { useState } from "react";
import { Plus, Pencil, Package } from "lucide-react";
import { fmt, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { TableShell, Btn, Modal, Field, Select , EmptyState} from "./ui";

export function Produits({ produits, onSaveProduit, notify, canEdit = true }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const list = produits.filter((p) => p.nom.toLowerCase().includes(q.toLowerCase()));

  const save = async (form) => {
    await onSaveProduit(form);
    notify(form.id ? "Produit mis à jour" : "Produit ajouté");
    setEditing(null);
  };

  return (
    <div>
      <TableShell headers={["Nom", "Catégorie", "Prix HT", "TVA", "Prix TTC", ""]} onSearch={setQ}
        searchPlaceholder="Rechercher un produit…"
        action={canEdit && <Btn icon={Plus} onClick={() => setEditing({ nom: "", categorie: "Service", prixHT: 0, tva: 18 })}>Nouveau produit</Btn>}>
        {list.length === 0 && (
          <tr><td colSpan={6}><EmptyState icon={Package} title="Aucun produit ou service" subtitle="Ajoutez votre catalogue pour accélérer la création de devis." /></td></tr>
        )}
        {list.map((p) => (
          <tr key={p.id}>
            <td style={{ ...td, fontWeight: 600 }}>{p.nom}</td>
            <td style={td}>{p.categorie}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(p.prixHT)}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{p.tva}%</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(p.prixHT * (1 + p.tva / 100))}</td>
            <td style={{ ...td, textAlign: "right" }}>{canEdit && <Btn variant="ghost" small icon={Pencil} onClick={() => setEditing(p)}>Modifier</Btn>}</td>
          </tr>
        ))}
      </TableShell>
      {editing && (
        <Modal title={editing.id ? "Modifier le produit" : "Nouveau produit"} onClose={() => setEditing(null)}>
          <ProduitForm data={editing} onSave={save} />
        </Modal>
      )}
    </div>
  );
}

function ProduitForm({ data, onSave }) {
  const [form, setForm] = useState(data);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <Field label="Nom"><input style={inputStyle} value={form.nom} onChange={set("nom")} /></Field>
      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Catégorie">
          <Select value={form.categorie} onChange={set("categorie")}>
            {["Service", "Produit", "Formation", "Abonnement"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Prix HT (FCFA)"><input type="number" style={inputStyle} value={form.prixHT} onChange={set("prixHT")} /></Field>
        <Field label="TVA (%)"><input type="number" style={inputStyle} value={form.tva} onChange={set("tva")} /></Field>
      </div>
      <Btn variant="gold" onClick={() => onSave(form)}>Enregistrer</Btn>
    </div>
  );
}
