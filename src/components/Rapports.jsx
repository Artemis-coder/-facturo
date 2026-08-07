import React from "react";
import { Download, TrendingUp } from "lucide-react";
import { T, fmt } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals, montantEncaisseTotal } from "../lib/helpers";
import { exportCSV, exportExcel, exportRapportPDF } from "../lib/exports";
import { Card, Btn, EmptyState } from "./ui";

export function Rapports({ factures, clients, entreprise, notify }) {
  const parClient = clients.map((c) => ({
    c, total: montantEncaisseTotal(factures.filter((f) => f.clientId === c.id)),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const totalTVA = factures.reduce((s, f) => s + totals(f.lignes).tva, 0);
  const totalEncaisse = montantEncaisseTotal(factures);
  const today = new Date().toISOString().slice(0, 10);

  const exportPDF = async () => {
    await exportRapportPDF({
      entreprise, totalEncaisse, totalTVA,
      parClient: parClient.map(({ c, total }) => ({ nom: c.societe, total })),
    });
    notify("Rapport PDF téléchargé");
  };

  const exportXLSX = async () => {
    await exportExcel(
      `rapport-financier-${today}.xlsx`, "Encaissement par client",
      ["Client", "Montant encaissé (FCFA)"],
      parClient.map(({ c, total }) => [c.societe, Math.round(total)])
    );
    notify("Rapport Excel téléchargé");
  };

  const exportCSVFile = () => {
    exportCSV(
      `rapport-financier-${today}.csv`,
      ["Client", "Montant encaissé (FCFA)"],
      parClient.map(({ c, total }) => [c.societe, Math.round(total)])
    );
    notify("Rapport CSV téléchargé");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Btn icon={Download} variant="ghost" onClick={exportPDF}>Exporter PDF</Btn>
        <Btn icon={Download} variant="ghost" onClick={exportXLSX}>Exporter Excel</Btn>
        <Btn icon={Download} variant="ghost" onClick={exportCSVFile}>Exporter CSV</Btn>
      </div>

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>Montant total encaissé (paiements partiels inclus)</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: T.teal, fontWeight: 600 }}>{fmt(totalEncaisse)}</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>TVA collectée (toutes factures)</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: T.gold, fontWeight: 600 }}>{fmt(totalTVA)}</div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>Montant encaissé par client</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {parClient.length === 0 && (
              <tr><td colSpan={2}><EmptyState icon={TrendingUp} title="Aucun paiement reçu" subtitle="Le classement par client apparaîtra dès le premier encaissement." /></td></tr>
            )}
            {parClient.map(({ c, total }) => (
              <tr key={c.id}>
                <td style={td}>{c.societe}</td>
                <td style={{ ...td, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
