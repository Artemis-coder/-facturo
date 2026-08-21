import React from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { DollarSign, PieChart, FileText, CheckCircle2, Receipt, AlertTriangle } from "lucide-react";
import { T, fmt } from "../lib/theme";
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
              <CartesianGrid stroke={T.line} vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: T.inkSoft }} axisLine={{ stroke: T.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${T.line}` }} />
              <Line type="monotone" dataKey="ca" stroke={T.gold} strokeWidth={2.5} dot={{ r: 3, fill: T.gold }} />
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
