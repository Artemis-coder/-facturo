import React from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { T, fmt } from "../lib/theme";
import { montantEncaisseTotal, montantPaiementsPartiels } from "../lib/helpers";
import { Card, Badge } from "./ui";

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function caParMois(factures) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mois: MOIS_FR[d.getMonth()], ca: 0 });
  }
  // On additionne `regle` (montant réellement encaissé, paiements partiels
  // inclus) plutôt que le total facturé — c'est la même source que la carte
  // "Montant total encaissé" au-dessus, pour que le graphique évolue avec
  // exactement le chiffre affiché à l'écran.
  factures.forEach((f) => {
    const d = new Date(f.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((m) => m.key === key);
    if (m) m.ca += Number(f.regle || 0);
  });
  return months;
}

export function DashboardAdmin({ factures, devis, clients, setView }) {
  const cli = (id) => clients.find((c) => c.id === id);
  const montantEncaisse = montantEncaisseTotal(factures);
  const paiementsPartiels = montantPaiementsPartiels(factures);
  const impayees = factures.filter((f) => ["Envoyée", "En retard", "Partiellement payée"].includes(f.statut));
  const enRetard = factures.filter((f) => f.statut === "En retard").length;
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé").length;
  const projetsTermines = factures.filter((f) => f.projetTermine).length;
  const historique = caParMois(factures);

  const kpis = [
    { label: "Montant total encaissé (paiements partiels inclus)", value: fmt(montantEncaisse), tone: T.teal },
    { label: "Dont paiements partiels reçus", value: fmt(paiementsPartiels), tone: T.gold },
    { label: "Factures impayées", value: `${impayees.length}`, tone: T.gold, view: "factures" },
    { label: "Factures en retard", value: `${enRetard}`, tone: T.brick, view: "factures" },
    { label: "Devis en attente", value: `${devisEnAttente}`, tone: T.slate, view: "devis" },
    { label: "Projets terminés", value: `${projetsTermines}`, tone: T.teal, view: "factures" },
  ];

  return (
    <div>
      <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 22 }}>
        {kpis.map((k) => (
          <Card key={k.label} className="kpi-card" style={{ padding: "16px 18px", cursor: k.view ? "pointer" : "default" }}
            onClick={k.view ? () => setView(k.view) : undefined}>
            <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: k.tone, fontWeight: 600 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Évolution du chiffre d'affaires (6 derniers mois)</div>
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
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Dernières factures</div>
          {factures.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucune facture pour le moment.</div>}
          {factures.slice(0, 5).map((f) => (
            <div key={f.uuid} onClick={() => setView("factures")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>{f.id}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{cli(f.clientId)?.societe}</div>
              </div>
              <Badge statut={f.statut} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
