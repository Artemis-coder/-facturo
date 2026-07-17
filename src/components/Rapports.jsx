import React from "react";
import { Download } from "lucide-react";
import { T, fmt } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals } from "../lib/helpers";
import { Card, Btn } from "./ui";

export function Rapports({ factures, clients, notify }) {
  const parClient = clients.map((c) => ({
    c, total: factures.filter((f) => f.clientId === c.id && f.statut === "Payée").reduce((s, f) => s + totals(f.lignes).ttc, 0),
  })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const totalTVA = factures.reduce((s, f) => s + totals(f.lignes).tva, 0);
  const totalCA = factures.filter((f) => f.statut === "Payée").reduce((s, f) => s + totals(f.lignes).ttc, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Btn icon={Download} variant="ghost" onClick={() => notify("Export PDF généré (simulation)")}>Exporter PDF</Btn>
        <Btn icon={Download} variant="ghost" onClick={() => notify("Export Excel généré (simulation)")}>Exporter Excel</Btn>
        <Btn icon={Download} variant="ghost" onClick={() => notify("Export CSV généré (simulation)")}>Exporter CSV</Btn>
      </div>

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>CA total encaissé</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: T.teal, fontWeight: 600 }}>{fmt(totalCA)}</div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600, marginBottom: 8 }}>TVA collectée (toutes factures)</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: T.gold, fontWeight: 600 }}>{fmt(totalTVA)}</div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>Chiffre d'affaires par client</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {parClient.length === 0 && (
              <tr><td style={{ ...td, color: T.inkSoft }}>Aucune facture payée pour le moment.</td></tr>
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
