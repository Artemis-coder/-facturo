import React, { useState } from "react";
import { Plus, ArrowDownCircle, ArrowUpCircle, Trash2, Wallet, ChevronLeft, ChevronRight, Smartphone } from "lucide-react";
import { LineChart, Line, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { T, fmt, inputStyle, PALETTES } from "../lib/theme";
import { useTheme } from "../lib/useTheme";
import { td } from "../lib/tableStyles";
import { Card, Btn, Modal, Field, Select, TableShell, EmptyState, KpiBar } from "./ui";

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
  const { isDark } = useTheme();
  const P = isDark ? PALETTES.dark : PALETTES.light;
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filtre, setFiltre] = useState("Tout");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const cli = (id) => clients.find((c) => c.id === id);

  const annees = Array.from(new Set([
    ...paiements.map((p) => new Date(p.date).getFullYear()),
    ...depenses.map((d) => new Date(d.date).getFullYear()),
    new Date().getFullYear(),
  ])).sort((a, b) => b - a);

  const paiementsAnnee = annee === "Toutes" ? paiements : paiements.filter((p) => new Date(p.date).getFullYear() === annee);
  const depensesAnnee = annee === "Toutes" ? depenses : depenses.filter((d) => new Date(d.date).getFullYear() === annee);

  const totalEntrees = paiementsAnnee.reduce((s, p) => s + p.montant, 0);
  const totalSorties = depensesAnnee.reduce((s, d) => s + d.montant, 0);
  const solde = totalEntrees - totalSorties;
  const historique = fluxParMois(paiementsAnnee, depensesAnnee);

  const kpis = [
    {
      label: "Solde de Trésorerie",
      value: fmt(solde),
      sub: solde >= 0 ? "Résultat net positif" : "Déficit de trésorerie",
      tone: solde >= 0 ? T.teal : T.brick,
      icon: Wallet,
      onClick: () => setFiltre("Tout")
    },
    {
      label: "Total des Entrées",
      value: fmt(totalEntrees),
      sub: "Paiements clients encaissés",
      tone: T.teal,
      icon: ArrowDownCircle,
      onClick: () => setFiltre("Entrée")
    },
    {
      label: "Total des Sorties",
      value: fmt(totalSorties),
      sub: "Dépenses & charges décaissées",
      tone: T.brick,
      icon: ArrowUpCircle,
      onClick: () => setFiltre("Sortie")
    },
  ];

  const parCategorie = CATEGORIES.map((cat) => ({
    categorie: cat, total: depensesAnnee.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  const parMode = MODES.map((mode) => ({
    mode, total: paiementsAnnee.filter((p) => p.mode === mode).reduce((s, p) => s + p.montant, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  const mouvements = [
    ...paiementsAnnee.map((p) => ({ type: "Entrée", date: p.date, montant: p.montant, libelle: `Paiement facture ${p.factureNumero}`, detail: cli(p.clientId)?.societe || cli(p.clientId)?.nom, mode: p.mode, source: p })),
    ...depensesAnnee.map((d) => ({ type: "Sortie", date: d.date, montant: d.montant, libelle: d.categorie, detail: d.description, mode: d.mode, source: d })),
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

  const annIdx = annees.indexOf(annee);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Btn variant="ghost" small icon={ChevronLeft}
          onClick={() => annIdx < annees.length - 1 && setAnnee(annees[annIdx + 1])}
          disabled={annee === "Toutes" || annIdx >= annees.length - 1}>{""}</Btn>
        <select value={annee} onChange={(e) => setAnnee(e.target.value === "Toutes" ? "Toutes" : Number(e.target.value))}
          style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, color: T.ink, background: "#fff" }}>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
          <option value="Toutes">Toutes les années</option>
        </select>
        <Btn variant="ghost" small icon={ChevronRight}
          onClick={() => annIdx > 0 && setAnnee(annees[annIdx - 1])}
          disabled={annee === "Toutes" || annIdx <= 0}>{""}</Btn>
      </div>

      <KpiBar items={kpis} />

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Entrées &amp; sorties (6 derniers mois)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historique}>
              <defs>
                <linearGradient id="gradEnt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.teal} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={P.teal} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.brick} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={P.brick} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={P.line} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: P.inkSoft }} axisLine={{ stroke: P.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${P.line}`, background: P.paper, color: P.ink, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area name="Entrées" type="monotone" dataKey="entrees" stroke="none" fill="url(#gradEnt)" />
              <Line name="Entrées" type="monotone" dataKey="entrees" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal, strokeWidth: 0 }} activeDot={{ r: 5, fill: P.teal, stroke: P.paper, strokeWidth: 2 }} />
              <Area name="Sorties" type="monotone" dataKey="sorties" stroke="none" fill="url(#gradSor)" />
              <Line name="Sorties" type="monotone" dataKey="sorties" stroke={P.brick} strokeWidth={2.5} dot={{ r: 3, fill: P.brick, strokeWidth: 0 }} activeDot={{ r: 5, fill: P.brick, stroke: P.paper, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, marginBottom: 12 }}>Encaissements par moyen de paiement</div>
            {parMode.length === 0 && <div style={{ fontSize: 12, color: T.inkSoft }}>Aucun encaissement.</div>}
            {parMode.map(({ mode, total }) => (
              <div key={mode} style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                  <span style={{ color: T.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                    {mode === "Mobile Money" && <Smartphone size={11} />}{mode}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(total)}</span>
                </div>
                <div style={{ height: 5, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (total / (parMode[0]?.total || 1)) * 100)}%`, background: T.teal }} />
                </div>
              </div>
            ))}
          </Card>

          <Card style={{ padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, marginBottom: 12 }}>Dépenses par catégorie</div>
            {parCategorie.length === 0 && <div style={{ fontSize: 12, color: T.inkSoft }}>Aucune dépense enregistrée.</div>}
            {parCategorie.map(({ categorie, total }) => (
              <div key={categorie} style={{ marginBottom: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
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
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["Tout", "Entrée", "Sortie"].map((f) => (
          <button key={f} onClick={() => setFiltre(f)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            border: `1px solid ${filtre === f ? T.ink : T.line}`, background: filtre === f ? T.invert : T.paper,
            color: filtre === f ? T.invertFg : T.inkSoft,
          }}>{f === "Tout" ? "Tout" : f + "s"}</button>
        ))}
      </div>

      <TableShell headers={["Date", "Type", "Libellé", "Détail", "Mode", "Montant", ""]} onSearch={() => {}} searchPlaceholder="Rechercher…"
        action={canManage && <Btn icon={Plus} onClick={() => setCreating(true)}>Nouvelle dépense</Btn>}>
        {mouvementsFiltres.length === 0 && (
          <tr><td colSpan={7}><EmptyState icon={Wallet} title="Aucun mouvement" subtitle="Les encaissements de factures et vos dépenses apparaîtront ici." /></td></tr>
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
