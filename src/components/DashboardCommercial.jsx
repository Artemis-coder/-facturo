import React from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { UserPlus, UserCheck, FileText, TrendingUp, FolderKanban } from "lucide-react";
import { T, fmt, PALETTES } from "../lib/theme";
import { useTheme } from "../lib/useTheme";
import { Card, Badge, KpiBar } from "./ui";

const STATUS_COLORS = {
  Accepté: "#1F7A63",
  Refusé: "#AE3B45",
  Envoyé: "#C98A2B",
  Brouillon: "#5C6B8A",
  Expiré: "#9AA3B8",
};

export function DashboardCommercial({ devis, clients, projets, setView }) {
  const { isDark } = useTheme();
  const P = isDark ? PALETTES.dark : PALETTES.light;
  const prospects = clients.filter((c) => c.statut === "Prospect");
  const clientsValides = clients.filter((c) => c.statut === "Client");
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé").length;
  const devisEnvoyes = devis.filter((d) => ["Envoyé", "Accepté", "Refusé", "Expiré"].includes(d.statut)).length;
  const devisAcceptes = devis.filter((d) => d.statut === "Accepté").length;
  const tauxConversion = devisEnvoyes > 0 ? Math.round((devisAcceptes / devisEnvoyes) * 100) : 0;
  const projetsEnCours = projets.filter((p) => p.statut === "En cours");

  const cli = (id) => clients.find((c) => c.id === id);

  const statsDevis = [
    { statut: "Brouillon", valeur: devis.filter((d) => d.statut === "Brouillon").length },
    { statut: "Envoyé", valeur: devis.filter((d) => d.statut === "Envoyé").length },
    { statut: "Accepté", valeur: devis.filter((d) => d.statut === "Accepté").length },
    { statut: "Refusé", valeur: devis.filter((d) => d.statut === "Refusé").length },
    { statut: "Expiré", valeur: devis.filter((d) => d.statut === "Expiré").length },
  ].filter((s) => s.valeur > 0);

  const pieData = [
    { name: "Acceptés", value: devisAcceptes },
    { name: "En attente", value: devis.filter((d) => d.statut === "Envoyé").length },
    { name: "Refusés / Expirés", value: devis.filter((d) => ["Refusé", "Expiré"].includes(d.statut)).length },
    { name: "Brouillons", value: devis.filter((d) => d.statut === "Brouillon").length },
  ].filter((d) => d.value > 0);

  const pieColors = [P.teal, P.gold, P.brick, P.slate];

  const kpis = [
    { label: "Prospects", value: `${prospects.length}`, sub: "Opportunités en cours", tone: T.gold, icon: UserPlus, onClick: () => setView("clients") },
    { label: "Clients Validés", value: `${clientsValides.length}`, sub: "Comptes actifs", tone: T.teal, icon: UserCheck, onClick: () => setView("clients") },
    { label: "Devis en Attente", value: `${devisEnAttente}`, sub: "À relancer", tone: T.slate, icon: FileText, onClick: () => setView("devis") },
    { label: "Taux de Conversion", value: `${tauxConversion}%`, sub: "Devis transformés", tone: T.teal, icon: TrendingUp, onClick: () => setView("devis") },
    { label: "Projets en Cours", value: `${projetsEnCours.length}`, sub: "Dossiers de réalisation", tone: T.slate, icon: FolderKanban, onClick: () => setView("projets") },
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

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Devis par statut
          </div>
          {statsDevis.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun devis pour le moment.</div>}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statsDevis}>
              <CartesianGrid stroke={P.line} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="statut" tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={{ stroke: P.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: P.inkSoft }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} devis`, ""]} contentStyle={tooltipStyle} cursor={{ fill: P.hover }} />
              <Bar dataKey="valeur" radius={[6, 6, 0, 0]}>
                {statsDevis.map((entry) => (
                  <Cell key={entry.statut} fill={STATUS_COLORS[entry.statut] || P.slate} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Répartition des devis
          </div>
          {pieData.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun devis pour le moment.</div>}
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: P.inkSoft }}>
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} devis`, ""]} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Projets en cours
          </div>
          {projetsEnCours.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun projet en cours pour le moment.</div>}
          {projetsEnCours.map((p) => (
            <div key={p.id} onClick={() => setView("projets")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nom}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{cli(p.clientId)?.societe || cli(p.clientId)?.nom || "Sans client associé"}</div>
              </div>
              <span style={{ fontSize: 11, color: T.slate, fontWeight: 500 }}>En cours</span>
            </div>
          ))}
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, marginBottom: 14 }}>
            Derniers prospects
          </div>
          {prospects.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun prospect enregistré pour le moment.</div>}
          {prospects.slice(0, 6).map((c) => (
            <div key={c.id} onClick={() => setView("clients")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.societe || c.nom}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{c.nom}</div>
              </div>
              <Badge statut="Prospect" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
