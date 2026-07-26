import React, { useState } from "react";
import { Plus, ArrowDownCircle, ArrowUpCircle, Trash2, Wallet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { T, fmt, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { Card, Btn, Modal, Field, Select, TableShell } from "./ui";

const CATEGORIES = [
  "Loyer", "Salaires", "Achats & fournitures", "Transport & carburant",
  "Communication & Internet", "Impôts & taxes", "Équipement & matériel",
  "Marketing & publicité", "Entretien & réparations", "Autre",
];
const MODES = ["Espèces", "Virement", "Mobile Money", "Chèque", "Carte bancaire"];
const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function fluxParMois(paiements, depenses) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mois: MOIS_FR[d.getMonth()], entrees: 0, sorties: 0 });
  }
  paiements.forEach((p) => {
    const d = new Date(p.date);
    const m = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.entrees += p.montant;
  });
  depenses.forEach((dep) => {
    const d = new Date(dep.date);
    const m = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.sorties += dep.montant;
  });
  return months;
}

export function Finance({ paiements, depenses, clients, saveDepense, deleteDepense, userId, notify, canManage = true, canDelete = false }) {
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filtre, setFiltre] = useState("Tout");
  const cli = (id) => clients.find((c) => c.id === id);

  const totalEntrees = paiements.reduce((s, p) => s + p.montant, 0);
  const totalSorties = depenses.reduce((s, d) => s + d.montant, 0);
  const solde = totalEntrees - totalSorties;
  const historique = fluxParMois(paiements, depenses);

  const parCategorie = CATEGORIES.map((cat) => ({
    categorie: cat, total: depenses.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  // Journal unifié : chaque entrée (paiement client) et chaque sortie
  // (dépense) fusionnées et triées par date, la même vue que l'utilisateur
  // demande — "les allées et les retours, tout ce qui rentre et tout ce qui sort".
  const mouvements = [
    ...paiements.map((p) => ({ type: "Entrée", date: p.date, montant: p.montant, libelle: `Paiement facture ${p.factureNumero}`, detail: cli(p.clientId)?.societe, mode: p.mode, source: p })),
    ...depenses.map((d) => ({ type: "Sortie", date: d.date, montant: d.montant, libelle: d.categorie, detail: d.description, mode: d.mode, source: d })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const mouvementsFiltres = mouvements.filter((m) => filtre === "Tout" || m.type === filtre);

  const save = async (form) => {
    const { error } = await saveDepense(form, userId);
    notify(error ? "Échec : " + error.message : "Dépense enregistrée");
    if (!error) setCreating(false);
  };

  const confirmerSuppression = async () => {
    const { error } = await deleteDepense(deleting);
    notify(error ? "Suppression refusée : " + error.message : "Dépense supprimée");
    setDeleting(null);
  };

  return (
    <div>
      <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>Solde de trésorerie</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: solde >= 0 ? T.teal : T.brick, fontWeight: 600 }}>{fmt(solde)}</div>
        </Card>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>Total des entrées</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: T.teal, fontWeight: 600 }}>{fmt(totalEntrees)}</div>
        </Card>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>Total des sorties</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: T.brick, fontWeight: 600 }}>{fmt(totalSorties)}</div>
        </Card>
      </div>

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Entrées &amp; sorties (6 derniers mois)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historique}>
              <CartesianGrid stroke={T.line} vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: T.inkSoft }} axisLine={{ stroke: T.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${T.line}` }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line name="Entrées" type="monotone" dataKey="entrees" stroke={T.teal} strokeWidth={2.5} dot={{ r: 3, fill: T.teal }} />
              <Line name="Sorties" type="monotone" dataKey="sorties" stroke={T.brick} strokeWidth={2.5} dot={{ r: 3, fill: T.brick }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Dépenses par catégorie</div>
          {parCategorie.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucune dépense enregistrée.</div>}
          {parCategorie.map(({ categorie, total }) => (
            <div key={categorie} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: T.inkSoft }}>{categorie}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(total)}</span>
              </div>
              <div style={{ height: 5, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (total / (parCategorie[0]?.total || 1)) * 100)}%`, background: T.gold }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["Tout", "Entrée", "Sortie"].map((f) => (
          <button key={f} onClick={() => setFiltre(f)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            border: `1px solid ${filtre === f ? T.ink : T.line}`, background: filtre === f ? T.ink : "#fff",
            color: filtre === f ? "#fff" : T.inkSoft,
          }}>{f === "Tout" ? "Tout" : f + "s"}</button>
        ))}
      </div>

      <TableShell headers={["Date", "Type", "Libellé", "Détail", "Mode", "Montant", ""]} onSearch={() => {}} searchPlaceholder="Rechercher…"
        action={canManage && <Btn icon={Plus} onClick={() => setCreating(true)}>Nouvelle dépense</Btn>}>
        {mouvementsFiltres.length === 0 && (
          <tr><td style={{ ...td, color: T.inkSoft }} colSpan={7}>Aucun mouvement pour le moment.</td></tr>
        )}
        {mouvementsFiltres.map((m, i) => (
          <tr key={i}>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{m.date}</td>
            <td style={td}>
              {m.type === "Entrée" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.teal, fontSize: 12 }}><ArrowDownCircle size={13} /> Entrée</span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.brick, fontSize: 12 }}><ArrowUpCircle size={13} /> Sortie</span>
              )}
            </td>
            <td style={{ ...td, fontWeight: 600 }}>{m.libelle}</td>
            <td style={{ ...td, color: T.inkSoft }}>{m.detail || "—"}</td>
            <td style={{ ...td, color: T.inkSoft }}>{m.mode || "—"}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace", color: m.type === "Entrée" ? T.teal : T.brick }}>
              {m.type === "Entrée" ? "+" : "−"} {fmt(m.montant)}
            </td>
            <td style={{ ...td, textAlign: "right" }}>
              {m.type === "Sortie" && canDelete && (
                <Btn variant="danger" small icon={Trash2} onClick={() => setDeleting(m.source)}>Supprimer</Btn>
              )}
            </td>
          </tr>
        ))}
      </TableShell>

      {creating && (
        <Modal title="Nouvelle dépense" onClose={() => setCreating(false)}>
          <DepenseForm onSave={save} />
        </Modal>
      )}

      {deleting && (
        <Modal title="Supprimer cette dépense ?" onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>Cette action est définitive.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="danger" onClick={confirmerSuppression}>Oui, supprimer</Btn>
            <Btn variant="ghost" onClick={() => setDeleting(null)}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DepenseForm({ onSave }) {
  const [form, setForm] = useState({
    categorie: CATEGORIES[0], description: "", montant: "", date: new Date().toISOString().slice(0, 10), mode: MODES[0],
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div>
      <Field label="Catégorie">
        <Select value={form.categorie} onChange={set("categorie")}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Montant (FCFA)"><input type="number" style={inputStyle} value={form.montant} onChange={set("montant")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Date"><input type="date" style={inputStyle} value={form.date} onChange={set("date")} /></Field>
        <Field label="Mode de paiement">
          <Select value={form.mode} onChange={set("mode")}>
            {MODES.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Description (optionnel)"><input style={inputStyle} value={form.description} onChange={set("description")} placeholder="Ex. Loyer de bureau — juillet" /></Field>
      <Btn variant="gold" onClick={() => onSave(form)}>Enregistrer la dépense</Btn>
    </div>
  );
}
