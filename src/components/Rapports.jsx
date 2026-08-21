import React from "react";
import { Download, TrendingUp, DollarSign, Clock, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { T, fmt } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals, montantEncaisseTotal } from "../lib/helpers";
import { exportCSV, exportExcel, exportRapportPDF } from "../lib/exports";
import { Card, Btn, EmptyState, KpiBar } from "./ui";

export function Rapports({ factures, clients, entreprise, notify }) {
  const parClient = clients.map((c) => ({
    c, total: montantEncaisseTotal(factures.filter((f) => f.clientId === c.id)),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);

  const totalTVA = factures.reduce((s, f) => s + totals(f.lignes, f.remiseGlobale).tva, 0);
  const totalEncaisse = montantEncaisseTotal(factures);
  const totalFactureTTC = factures.reduce((s, f) => s + totals(f.lignes, f.remiseGlobale).ttc, 0);
  const resteARecouvrer = Math.max(0, totalFactureTTC - totalEncaisse);
  const payeesCount = factures.filter((f) => f.statut === "Payée").length;
  const enRetardCount = factures.filter((f) => f.statut === "En retard").length;
  const today = new Date().toISOString().slice(0, 10);

  const kpis = [
    { label: "Montant Total Encaissé", value: fmt(totalEncaisse), sub: "Paiements partiels & totaux reçus", tone: T.teal, icon: DollarSign },
    { label: "Reste à Recouvrer", value: fmt(resteARecouvrer), sub: "Solde des factures en cours", tone: T.gold, icon: Clock },
    { label: "TVA Collectée (18%)", value: fmt(totalTVA), sub: "Cumul TVA toutes factures", tone: T.slate, icon: Receipt },
    { label: "Santé Recouvrement", value: `${payeesCount} réglées`, sub: enRetardCount > 0 ? `${enRetardCount} facture(s) en retard` : "Échéances à jour", tone: enRetardCount > 0 ? T.brick : T.teal, icon: enRetardCount > 0 ? AlertCircle : CheckCircle2 },
  ];

  const exportPDF = async () => {
    await exportRapportPDF({
      entreprise, totalEncaisse, totalTVA,
      parClient: parClient.map(({ c, total }) => ({ nom: c.societe || c.nom, total })),
    });
    notify("Rapport PDF téléchargé");
  };

  const exportXLSX = async () => {
    await exportExcel(
      `rapport-financier-${today}.xlsx`, "Encaissement par client",
      ["Client", "Montant encaissé (FCFA)"],
      parClient.map(({ c, total }) => [c.societe || c.nom, Math.round(total)])
    );
    notify("Rapport Excel téléchargé");
  };

  const exportCSVFile = () => {
    exportCSV(
      `rapport-financier-${today}.csv`,
      ["Client", "Montant encaissé (FCFA)"],
      parClient.map(({ c, total }) => [c.societe || c.nom, Math.round(total)])
    );
    notify("Rapport CSV téléchargé");
  };

  return (
    <div>
      <KpiBar items={kpis} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Btn icon={Download} variant="ghost" onClick={exportPDF}>Exporter PDF</Btn>
        <Btn icon={Download} variant="ghost" onClick={exportXLSX}>Exporter Excel</Btn>
        <Btn icon={Download} variant="ghost" onClick={exportCSVFile}>Exporter CSV</Btn>
      </div>

      <Card>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600 }}>
          Montant encaissé par client
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {parClient.length === 0 && (
              <tr><td colSpan={2}><EmptyState icon={TrendingUp} title="Aucun paiement reçu" subtitle="Le classement par client apparaîtra dès le premier encaissement." /></td></tr>
            )}
            {parClient.map(({ c, total }) => (
              <tr key={c.id}>
                <td style={td}>{c.societe || c.nom}</td>
                <td style={{ ...td, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{fmt(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
