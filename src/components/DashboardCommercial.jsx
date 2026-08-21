import React from "react";
import { UserPlus, UserCheck, FileText, TrendingUp, FolderKanban } from "lucide-react";
import { T } from "../lib/theme";
import { Card, Badge, KpiBar } from "./ui";

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
    { label: "Prospects", value: `${prospects.length}`, sub: "Opportunités en cours", tone: T.gold, icon: UserPlus, onClick: () => setView("clients") },
    { label: "Clients Validés", value: `${clientsValides.length}`, sub: "Comptes actifs", tone: T.teal, icon: UserCheck, onClick: () => setView("clients") },
    { label: "Devis en Attente", value: `${devisEnAttente}`, sub: "À relancer", tone: T.slate, icon: FileText, onClick: () => setView("devis") },
    { label: "Taux de Conversion", value: `${tauxConversion}%`, sub: "Devis transformés", tone: T.teal, icon: TrendingUp, onClick: () => setView("devis") },
    { label: "Projets en Cours", value: `${projetsEnCours.length}`, sub: "Dossiers de réalisation", tone: T.slate, icon: FolderKanban, onClick: () => setView("projets") },
  ];

  return (
    <div>
      <KpiBar items={kpis} />

      <div className="grid-dash" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
