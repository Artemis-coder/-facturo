import React from "react";
import { LineChart, Line, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { DollarSign, PieChart, FileText, CheckCircle2, Receipt, AlertTriangle } from "lucide-react";
import { T, fmt, PALETTES } from "../lib/theme";
import { useTheme } from "../lib/useTheme";
import { montantEncaisseTotal, montantPaiementsPartiels } from "../lib/helpers";
import { Card, Badge, KpiBar } from "./ui";

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function encaisseParMois(factures) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mois: MOIS_FR[d.getMonth()], ca: 0 });
  }
  factures.forEach((f) => {
    const d = new Date(f.date);
    const m = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.ca += Number(f.regle || 0);
  });
  return months;
}

export function DashboardComptable({ devis, factures, clients, setView }) {
  const { isDark } = useTheme();
  const P = isDark ? PALETTES.dark : PALETTES.light;
  const cli = (id) => clients.find((c) => c.id === id);
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé");
  const devisAcceptes = devis.filter((d) => d.statut === "Accepté").length;
  const impayees = factures.filter((f) => ["Envoyée", "En retard", "Partiellement payée"].includes(f.statut));
  const enRetard = factures.filter((f) => f.statut === "En retard").length;
  const montantEncaisse = montantEncaisseTotal(factures);
  const paiementsPartiels = montantPaiementsPartiels(factures);
  const historique = encaisseParMois(factures);

  const kpis = [
    { label: "Montant Total Encaissé", value: fmt(montantEncaisse), sub: "Paiements partiels inclus", tone: T.teal, icon: DollarSign },
    { label: "Paiements Partiels", value: fmt(paiementsPartiels), sub: "Règlements partiels perçus", tone: T.gold, icon: PieChart },
    { label: "Devis en Attente", value: `${devisEnAttente.length}`, sub: "En attente de confirmation", tone: T.slate, icon: FileText, onClick: () => setView("devis") },
    { label: "Devis Acceptés", value: `${devisAcceptes}`, sub: "Transformables en factures", tone: T.teal, icon: CheckCircle2, onClick: () => setView("devis") },
    { label: "Factures Impayées", value: `${impayees.length}`, sub: "Règlements non finalisés", tone: T.gold, icon: Receipt, onClick: () => setView("factures") },
    { label: "Factures en Retard", value: `${enRetard}`, sub: "Rappels à effectuer", tone: T.brick, icon: AlertTriangle, onClick: () => setView("factures") },
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
            Encaissements (6 derniers mois)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historique}>
              <defs>
                <linearGradient id="gradEnc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.teal} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={P.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={P.line} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: P.inkSoft }} axisLine={{ stroke: P.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="ca" stroke="none" fill="url(#gradEnc)" />
              <Line type="monotone" dataKey="ca" stroke={P.teal} strokeWidth={2.5} dot={{ r: 3, fill: P.teal, strokeWidth: 0 }} activeDot={{ r: 5, fill: P.teal, stroke: P.paper, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Devis à vérifier
          </div>
          {devisEnAttente.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun devis en attente de réponse.</div>}
          {devisEnAttente.slice(0, 6).map((d) => (
            <div key={d.uuid} onClick={() => setView("devis")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 600 }}>{d.id}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{cli(d.clientId)?.societe || cli(d.clientId)?.nom}</div>
              </div>
              <Badge statut={d.statut} />
            </div>
          ))}
          <p style={{ fontSize: 11, color: T.inkSoft, marginTop: 12, lineHeight: 1.6 }}>
            Consultation uniquement — la création et la modification des devis restent réservées à l'Administrateur et au Commercial.
          </p>
        </Card>
      </div>
    </div>
  );
}
