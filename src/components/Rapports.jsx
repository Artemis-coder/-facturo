import React from "react";
import { LineChart, Line, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, Cell } from "recharts";
import { Download, TrendingUp, DollarSign, Clock, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { T, fmt, PALETTES } from "../lib/theme";
import { useTheme } from "../lib/useTheme";
import { td } from "../lib/tableStyles";
import { totals, montantEncaisseTotal } from "../lib/helpers";
import { exportCSV, exportExcel, exportRapportPDF } from "../lib/exports";
import { Card, Btn, EmptyState, KpiBar } from "./ui";

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function fluxAnnuels(factures, depenses) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({ key, mois: `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`, ca: 0, depenses: 0 });
  }
  factures.forEach((f) => {
    const d = new Date(f.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((m) => m.key === key);
    if (m) m.ca += Number(f.regle || 0);
  });
  depenses.forEach((dep) => {
    const d = new Date(dep.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((m) => m.key === key);
    if (m) m.depenses += dep.montant;
  });
  return months;
}

export function Rapports({ factures, clients, entreprise, notify }) {
  const { isDark } = useTheme();
  const P = isDark ? PALETTES.dark : PALETTES.light;
  const parClient = clients.map((c) => ({
    c, total: montantEncaisseTotal(factures.filter((f) => f.clientId === c.id)),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  const totalTVA = factures.reduce((s, f) => s + totals(f.lignes, f.remiseGlobale).tva, 0);
  const totalEncaisse = montantEncaisseTotal(factures);
  const totalFactureTTC = factures.reduce((s, f) => s + totals(f.lignes, f.remiseGlobale).ttc, 0);
  const resteARecouvrer = Math.max(0, totalFactureTTC - totalEncaisse);
  const payeesCount = factures.filter((f) => f.statut === "Payée").length;
  const enRetardCount = factures.filter((f) => f.statut === "En retard").length;
  const today = new Date().toISOString().slice(0, 10);

  const kpis = [
    { label: "Montant Total Encaissé", value: fmt(totalEncaisse), sub: "Paiements partiels & totaux reçus", tone: T.teal, icon: DollarSign },
    { label: "Reste à Recouvrer", value: fmt(resteARecouvrer), sub: "Solde des factures en cours", tone: T.gold, icon: Clock },
    { label: "TVA Collectée (18%)", value: fmt(totalTVA), sub: "Cumul TVA toutes factures", tone: T.slate, icon: Receipt },
    { label: "Santé Recouvrement", value: `${payeesCount} réglées`, sub: enRetardCount > 0 ? `${enRetardCount} facture(s) en retard` : "Échéances à jour", tone: enRetardCount > 0 ? T.brick : T.teal, icon: enRetardCount > 0 ? AlertCircle : CheckCircle2 },
  ];

  const historique = fluxAnnuels(factures, []);
  const topClients = parClient.slice(0, 5);

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 10,
    border: `1px solid ${P.line}`,
    background: P.paper,
    color: P.ink,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  const exportPDF = async () => {
    await exportRapportPDF({
      entreprise, totalEncaisse, totalTVA,
      parClient: parClient.map(({ c, total }) => ({ nom: c.societe || c.nom, total })),
    });
    notify("Rapport PDF téléchargé");
  };

  const exportXLSX = async () => {
    await exportExcel(
      `rapport-financier-${today}.xlsx`, "Encaissement par client",
      ["Client", "Montant encaissé (FCFA)"],
      parClient.map(({ c, total }) => [c.societe || c.nom, Math.round(total)])
    );
    notify("Rapport Excel téléchargé");
  };

  const exportCSVFile = () => {
    exportCSV(
      `rapport-financier-${today}.csv`,
      ["Client", "Montant encaissé (FCFA)"],
      parClient.map(({ c, total }) => [c.societe || c.nom, Math.round(total)])
    );
    notify("Rapport CSV téléchargé");
  };

  return (
    <div>
      <KpiBar items={kpis} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Btn icon={Download} variant="ghost" onClick={exportPDF}>Exporter PDF</Btn>
        <Btn icon={Download} variant="ghost" onClick={exportXLSX}>Exporter Excel</Btn>
        <Btn icon={Download} variant="ghost" onClick={exportCSVFile}>Exporter CSV</Btn>
      </div>

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 22 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Évolution du CA (12 derniers mois)
          </div>
          {historique.every((m) => m.ca === 0) && (
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucune donnée sur les 12 derniers mois.</div>
          )}
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historique}>
              <defs>
                <linearGradient id="gradCaRapp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.teal} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={P.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={P.line} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mois" tick={{ fontSize: 10, fill: P.inkSoft }} axisLine={{ stroke: P.line }} tickLine={false} interval={Math.max(0, Math.floor(historique.length / 6) - 1)} />
              <YAxis tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area name="Encaissé" type="monotone" dataKey="ca" stroke="none" fill="url(#gradCaRapp)" />
              <Line name="Encaissé" type="monotone" dataKey="ca" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal, strokeWidth: 0 }} activeDot={{ r: 5, fill: P.teal, stroke: P.paper, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Top 5 clients
          </div>
          {topClients.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun paiement reçu.</div>}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topClients} layout="vertical">
              <CartesianGrid stroke={P.line} horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} cursor={{ fill: P.hover }} />
              <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                {topClients.map((entry) => (
                  <Cell key={entry.nom} fill={P.gold} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600 }}>
          Montant encaissé par client
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {parClient.length === 0 && (
              <tr><td colSpan={2}><EmptyState icon={TrendingUp} title="Aucun paiement reçu" subtitle="Le classement par client apparaîtra dès le premier encaissement." /></td></tr>
            )}
            {parClient.map(({ c, total }) => (
              <tr key={c.id}>
                <td style={td}>{c.societe || c.nom}</td>
                <td style={{ ...td, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{fmt(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
