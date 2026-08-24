import React from "react";
import { LineChart, Line, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { DollarSign, PieChart, Receipt, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { T, fmt, PALETTES } from "../lib/theme";
import { useTheme } from "../lib/useTheme";
import { montantEncaisseTotal, montantPaiementsPartiels } from "../lib/helpers";
import { Card, Badge, KpiBar } from "./ui";

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function caParMois(factures) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mois: MOIS_FR[d.getMonth()], ca: 0 });
  }
  factures.forEach((f) => {
    const d = new Date(f.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((m) => m.key === key);
    if (m) m.ca += Number(f.regle || 0);
  });
  return months;
}

export function DashboardAdmin({ factures, devis, clients, setView }) {
  const { isDark } = useTheme();
  const P = isDark ? PALETTES.dark : PALETTES.light;
  const cli = (id) => clients.find((c) => c.id === id);
  const montantEncaisse = montantEncaisseTotal(factures);
  const paiementsPartiels = montantPaiementsPartiels(factures);
  const impayees = factures.filter((f) => ["Envoyée", "En retard", "Partiellement payée"].includes(f.statut));
  const enRetard = factures.filter((f) => f.statut === "En retard").length;
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé").length;
  const projetsTermines = factures.filter((f) => f.projetTermine).length;
  const historique = caParMois(factures);

  const kpis = [
    { label: "Montant Total Encaissé", value: fmt(montantEncaisse), sub: "Paiements partiels inclus", tone: T.teal, icon: DollarSign },
    { label: "Paiements Partiels Reçus", value: fmt(paiementsPartiels), sub: "Acomptes & versements", tone: T.gold, icon: PieChart },
    { label: "Factures Impayées", value: `${impayees.length}`, sub: "Règlements en attente", tone: T.gold, icon: Receipt, onClick: () => setView("factures") },
    { label: "Factures en Retard", value: `${enRetard}`, sub: "Échéances dépassées", tone: T.brick, icon: AlertTriangle, onClick: () => setView("factures") },
    { label: "Devis en Attente", value: `${devisEnAttente}`, sub: "À relancer ou signer", tone: T.slate, icon: FileText, onClick: () => setView("devis") },
    { label: "Projets Terminés", value: `${projetsTermines}`, sub: "Clôturés avec succès", tone: T.teal, icon: CheckCircle2, onClick: () => setView("factures") },
  ];

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 10,
    border: `1px solid ${P.line}`,
    background: P.paper,
    color: P.ink,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div>
      <KpiBar items={kpis} />

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Évolution du chiffre d'affaires (6 derniers mois)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historique}>
              <defs>
                <linearGradient id="gradCa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.gold} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={P.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={P.line} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: P.inkSoft }} axisLine={{ stroke: P.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="ca" stroke="none" fill="url(#gradCa)" />
              <Line type="monotone" dataKey="ca" stroke={P.gold} strokeWidth={2.5} dot={{ r: 3, fill: P.gold, strokeWidth: 0 }} activeDot={{ r: 5, fill: P.gold, stroke: P.paper, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Dernières factures
          </div>
          {factures.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucune facture pour le moment.</div>}
          {factures.slice(0, 5).map((f) => (
            <div key={f.uuid} onClick={() => setView("factures")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 600 }}>{f.id}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{cli(f.clientId)?.societe || cli(f.clientId)?.nom}</div>
              </div>
              <Badge statut={f.statut} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
