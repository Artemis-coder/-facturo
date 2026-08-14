import React from "react";
import { T } from "../lib/theme";
import { Card, Badge } from "./ui";

// Le rôle Employé ne voit déjà, via les policies RLS, que les devis/factures
// qu'il a lui-même créés — ce tableau de bord se contente de résumer ça.
export function DashboardEmploye({ devis, factures, clients, setView }) {
  const cli = (id) => clients.find((c) => c.id === id);
  const mesDevis = devis.length;
  const mesFactures = factures.length;
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé").length;

  const kpis = [
    { label: "Mes devis", value: `${mesDevis}`, tone: T.slate, view: "devis" },
    { label: "Mes devis en attente de réponse", value: `${devisEnAttente}`, tone: T.gold, view: "devis" },
    { label: "Mes factures", value: `${mesFactures}`, tone: T.teal, view: "factures" },
  ];

  return (
    <div>
      <div className="grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 22 }}>
        {kpis.map((k) => (
          <Card key={k.label} style={{ padding: "16px 18px", cursor: "pointer" }} onClick={() => setView(k.view)}>
            <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: k.tone, fontWeight: 600 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: "20px 22px" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, marginBottom: 14 }}>Mes derniers devis</div>
        {devis.length === 0 && <div style={{ fontSize: 12.5, color: T.inkSoft }}>Vous n'avez pas encore créé de devis.</div>}
        {devis.slice(0, 6).map((d) => (
          <div key={d.uuid} onClick={() => setView("devis")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>{d.id}</div>
              <div style={{ fontSize: 11.5, color: T.inkSoft }}>{cli(d.clientId)?.societe}</div>
            </div>
            <Badge statut={d.statut} />
          </div>
        ))}
      </Card>
    </div>
  );
}
