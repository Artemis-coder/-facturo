import React from "react";
import { T } from "../lib/theme";
import { Card, Badge } from "./ui";

// Tableau de bord Commercial : prospection et suivi client, jamais de
// montants de trésorerie — la partie Finance ne lui est de toute façon pas
// accessible (rôle exclu de la navigation ET des policies RLS).
export function DashboardCommercial({ devis, clients, projets, setView }) {
  const prospects = clients.filter((c) => c.statut === "Prospect");
  const clientsValides = clients.filter((c) => c.statut === "Client");
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé").length;
  const devisEnvoyes = devis.filter((d) => ["Envoyé", "Accepté", "Refusé", "Expiré"].includes(d.statut)).length;
  const devisAcceptes = devis.filter((d) => d.statut === "Accepté").length;
  const tauxConversion = devisEnvoyes > 0 ? Math.round((devisAcceptes / devisEnvoyes) * 100) : 0;
  const projetsEnCours = projets.filter((p) => p.statut === "En cours");

  const cli = (id) => clients.find((c) => c.id === id);

  const kpis = [
    { label: "Prospects", value: `${prospects.length}`, tone: T.gold, view: "clients" },
    { label: "Clients validés", value: `${clientsValides.length}`, tone: T.teal, view: "clients" },
    { label: "Devis en attente", value: `${devisEnAttente}`, tone: T.slate, view: "devis" },
    { label: "Taux de conversion des devis", value: `${tauxConversion}%`, tone: T.teal, view: "devis" },
    { label: "Projets en cours", value: `${projetsEnCours.length}`, tone: T.slate, view: "projets" },
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

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Projets en cours</div>
          {projetsEnCours.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Aucun projet en cours pour le moment.</div>}
          {projetsEnCours.map((p) => (
            <div key={p.id} onClick={() => setView("projets")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nom}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{cli(p.clientId)?.societe || "Sans client associé"}</div>
              </div>
              <span style={{ fontSize: 11, color: T.slate }}>En cours</span>
            </div>
          ))}
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Derniers prospects</div>
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
