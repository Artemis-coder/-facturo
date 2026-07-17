import React from "react";
import { fmt } from "../lib/theme";
import { ligneMontant, totals } from "../lib/helpers";

export function PrintArea({ printJob, entreprise }) {
  if (!printJob || !entreprise) return null;
  const { doc, type, client } = printJob;
  const t = totals(doc.lignes);
  const label = type === "devis" ? "Devis" : "Facture";
  return (
    <div id="print-area" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#16213A", padding: 40, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 36 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700 }}>{entreprise.nom}</div>
          <div style={{ fontSize: 12, color: "#5B647A", marginTop: 4, lineHeight: 1.6 }}>
            {entreprise.adresse}<br />{entreprise.tel}<br />RCCM {entreprise.rccm} · NIF {entreprise.nif}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>{label}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, marginTop: 4 }}>{doc.id}</div>
          <div style={{ fontSize: 12, color: "#5B647A", marginTop: 2 }}>Date : {doc.date}</div>
          {doc.echeance && <div style={{ fontSize: 12, color: "#5B647A" }}>Échéance : {doc.echeance}</div>}
        </div>
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, color: "#5B647A", marginBottom: 4 }}>Facturé à</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{client?.societe}</div>
        <div style={{ fontSize: 12.5, color: "#5B647A" }}>{client?.nom} · {client?.email} · {client?.tel}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #16213A" }}>
            {["Désignation", "Qté", "Remise", "Total"].map((h) => (
              <th key={h} style={{ textAlign: h === "Désignation" ? "left" : "right", fontSize: 11, textTransform: "uppercase", padding: "8px 4px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.lignes.map((l) => (
            <React.Fragment key={l.id}>
              <tr style={{ borderBottom: l.details?.length ? "none" : "1px solid #D9D6CC" }}>
                <td style={{ padding: "8px 4px", fontSize: 12.5, fontWeight: l.details?.length ? 600 : 400 }}>{l.nom}</td>
                <td style={{ padding: "8px 4px", fontSize: 12.5, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{l.qty}</td>
                <td style={{ padding: "8px 4px", fontSize: 12.5, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{l.remise}%</td>
                <td style={{ padding: "8px 4px", fontSize: 12.5, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(ligneMontant(l))}</td>
              </tr>
              {l.details && l.details.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i === l.details.length - 1 ? "1px solid #D9D6CC" : "none" }}>
                  <td style={{ padding: "2px 4px 2px 18px", fontSize: 11, color: "#5B647A" }}>— {d.label || "Élément sans nom"}</td>
                  <td></td><td></td>
                  <td style={{ padding: "2px 4px", fontSize: 11, color: "#5B647A", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(Number(d.prix || 0))}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 30 }}>
        <div style={{ width: 240 }}>
          {[["Total HT", t.ht], ["TVA", t.tva]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
              <span>{l}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(v)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, borderTop: "2px solid #16213A", paddingTop: 6, marginTop: 4 }}>
            <span>Total TTC</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(t.ttc)}</span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#5B647A", borderTop: "1px solid #D9D6CC", paddingTop: 14 }}>{entreprise.conditions}</div>
    </div>
  );
}
