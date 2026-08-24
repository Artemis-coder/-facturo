import React from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { FileText, Clock, Receipt } from "lucide-react";
import { T, fmt, PALETTES } from "../lib/theme";
import { useTheme } from "../lib/useTheme";
import { Card, Badge, KpiBar } from "./ui";

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function evolutionParMois(devis, factures) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({ key, mois: MOIS_FR[d.getMonth()], devis: 0, factures: 0 });
  }
  devis.forEach((dv) => {
    const d = new Date(dv.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((m) => m.key === key);
    if (m) m.devis += 1;
  });
  factures.forEach((f) => {
    const d = new Date(f.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((m) => m.key === key);
    if (m) m.factures += 1;
  });
  return months;
}

export function DashboardEmploye({ devis, factures, clients, setView }) {
  const { isDark } = useTheme();
  const P = isDark ? PALETTES.dark : PALETTES.light;
  const cli = (id) => clients.find((c) => c.id === id);
  const mesDevis = devis.length;
  const mesFactures = factures.length;
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé").length;

  const statsFactures = [
    { statut: "Brouillon", valeur: factures.filter((f) => f.statut === "Brouillon").length },
    { statut: "Envoyée", valeur: factures.filter((f) => f.statut === "Envoyée").length },
    { statut: "Payée", valeur: factures.filter((f) => f.statut === "Payée").length },
    { statut: "Partiellement payée", valeur: factures.filter((f) => f.statut === "Partiellement payée").length },
    { statut: "En retard", valeur: factures.filter((f) => f.statut === "En retard").length },
  ].filter((s) => s.valeur > 0);

  const historique = evolutionParMois(devis, factures);

  const kpis = [
    { label: "Mes Devis", value: `${mesDevis}`, sub: "Devis rédigés par vous", tone: T.slate, icon: FileText, onClick: () => setView("devis") },
    { label: "Mes Devis en Attente", value: `${devisEnAttente}`, sub: "En cours de validation", tone: T.gold, icon: Clock, onClick: () => setView("devis") },
    { label: "Mes Factures", value: `${mesFactures}`, sub: "Factures créées par vous", tone: T.teal, icon: Receipt, onClick: () => setView("factures") },
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

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Mes factures par statut
          </div>
          {statsFactures.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucune facture pour le moment.</div>}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statsFactures}>
              <CartesianGrid stroke={P.line} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="statut" tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={{ stroke: P.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} factures`, ""]} contentStyle={tooltipStyle} cursor={{ fill: P.hover }} />
              <Bar dataKey="valeur" radius={[6, 6, 0, 0]}>
                {statsFactures.map((entry) => (
                  <Cell key={entry.statut} fill={STATUS_COLORS[entry.statut] || P.slate} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Évolution mensuelle
          </div>
          {historique.every((m) => m.devis === 0 && m.factures === 0) && (
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucune activité sur les 6 derniers mois.</div>
          )}
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={historique}>
              <defs>
                <linearGradient id="gradDevisEmp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.slate} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={P.slate} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFactEmp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={P.teal} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={P.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={P.line} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: P.inkSoft }} axisLine={{ stroke: P.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area name="Devis" type="monotone" dataKey="devis" stroke={P.slate} fill="url(#gradDevisEmp)" strokeWidth={2} dot={{ r: 3, fill: P.slate, strokeWidth: 0 }} activeDot={{ r: 5, fill: P.slate, stroke: P.paper, strokeWidth: 2 }} />
              <Area name="Factures" type="monotone" dataKey="factures" stroke={P.teal} fill="url(#gradFactEmp)" strokeWidth={2} dot={{ r: 3, fill: P.teal, strokeWidth: 0 }} activeDot={{ r: 5, fill: P.teal, stroke: P.paper, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card style={{ padding: "20px 22px" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
          Mes derniers devis
        </div>
        {devis.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Vous n'avez pas encore créé de devis.</div>}
        {devis.slice(0, 6).map((d) => (
          <div key={d.uuid} onClick={() => setView("devis")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 600 }}>{d.id}</div>
              <div style={{ fontSize: 11.5, color: T.inkSoft }}>{cli(d.clientId)?.societe || cli(d.clientId)?.nom}</div>
            </div>
            <Badge statut={d.statut} />
          </div>
        ))}
      </Card>
    </div>
  );
}

const STATUS_COLORS = {
  Brouillon: "#5C6B8A",
  Envoyée: "#C98A2B",
  Payée: "#1F7A63",
  "Partiellement payée": "#4CBE97",
  "En retard": "#AE3B45",
  Expirée: "#9AA3B8",
  Annulée: "#7A8299",
};
