import React from "react";
import { FileText, Clock, Receipt } from "lucide-react";
import { T } from "../lib/theme";
import { Card, Badge, KpiBar } from "./ui";

export function DashboardEmploye({ devis, factures, clients, setView }) {
  const cli = (id) => clients.find((c) => c.id === id);
  const mesDevis = devis.length;
  const mesFactures = factures.length;
  const devisEnAttente = devis.filter((d) => d.statut === "Envoyé").length;

  const kpis = [
    { label: "Mes Devis", value: `${mesDevis}`, sub: "Devis rédigés par vous", tone: T.slate, icon: FileText, onClick: () => setView("devis") },
    { label: "Mes Devis en Attente", value: `${devisEnAttente}`, sub: "En cours de validation", tone: T.gold, icon: Clock, onClick: () => setView("devis") },
    { label: "Mes Factures", value: `${mesFactures}`, sub: "Factures créées par vous", tone: T.teal, icon: Receipt, onClick: () => setView("factures") },
  ];

  return (
    <div>
      <KpiBar items={kpis} />

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
