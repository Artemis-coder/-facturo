import { pdfFmt } from "./pdfFormat";
import { ligneMontant, totals } from "./helpers";

const INK = [22, 33, 58];
const GOLD = [201, 138, 43];
const TEAL = [31, 122, 99];
const BRICK = [174, 59, 69];
const SLATE = [92, 107, 138];
const INK_SOFT = [140, 148, 165]; // sur fond navy
const GRAY = [91, 100, 122]; // sur fond clair
const LINE = [217, 214, 204];
const BG = [246, 245, 241];

const STATUT_COLOR = {
  "Brouillon": SLATE, "Envoyé": SLATE, "Envoyée": SLATE,
  "Accepté": TEAL, "Payée": TEAL,
  "Partiellement payée": GOLD,
  "Refusé": BRICK, "En retard": BRICK, "Expiré": BRICK, "Annulée": BRICK,
};

export async function genererDocumentPDF(doc, type, client, entreprise) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const M = 42;
  const R = W - M;

  // --- Bandeau d'en-tête ---
  pdf.setFillColor(...INK);
  pdf.rect(0, 0, W, 96, "F");
  pdf.setFillColor(...GOLD);
  pdf.rect(M, 30, 6, 6, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text(entreprise?.nom || "", M + 14, 38);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INK_SOFT);
  pdf.text([entreprise?.adresse, entreprise?.tel, `RCCM ${entreprise?.rccm || "—"} · NIF ${entreprise?.nif || "—"}`]
    .filter(Boolean).join("   ·   "), M, 58);

  const label = type === "devis" ? "DEVIS" : "FACTURE";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.setTextColor(...GOLD);
  pdf.text(label, R, 38, { align: "right" });
  pdf.setFont("courier", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text(doc.id, R, 54, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...INK_SOFT);
  const infoLine = [`Date ${doc.date}`, doc.echeance && `Échéance ${doc.echeance}`].filter(Boolean).join("   ·   ");
  pdf.text(infoLine, R, 68, { align: "right" });

  // Pastille de statut
  const sc = STATUT_COLOR[doc.statut] || SLATE;
  pdf.setFillColor(...sc);
  const label2 = doc.statut.toUpperCase();
  const bw = pdf.getTextWidth(label2) + 18;
  pdf.roundedRect(R - bw, 78, bw, 15, 7.5, 7.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text(label2, R - bw / 2, 88, { align: "center" });

  // --- Bloc client ---
  let y = 128;
  pdf.setFillColor(...BG);
  pdf.roundedRect(M, y, R - M, 54, 6, 6, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...GOLD);
  pdf.text("FACTURÉ À", M + 14, y + 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11.5);
  pdf.setTextColor(...INK);
  pdf.text(client?.societe || "", M + 14, y + 34);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...GRAY);
  pdf.text([client?.nom, client?.email, client?.tel].filter(Boolean).join("  ·  "), M + 14, y + 47);

  // --- Tableau des lignes ---
  const body = [];
  doc.lignes.forEach((l) => {
    body.push([l.nom, String(l.qty), `${l.remise}%`, pdfFmt(ligneMontant(l))]);
    if (l.description) {
      body.push([{ content: l.description, colSpan: 4, styles: { textColor: GRAY, fontStyle: "italic", fontSize: 8.5, fillColor: 255 } }]);
    }
  });

  autoTable(pdf, {
    startY: y + 70,
    head: [["Désignation", "Qté", "Remise", "Total"]],
    body,
    margin: { left: M, right: M },
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 7, lineColor: LINE, lineWidth: 0.4 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: BG },
    columnStyles: { 1: { halign: "right", cellWidth: 45 }, 2: { halign: "right", cellWidth: 55 }, 3: { halign: "right", cellWidth: 90 } },
  });

  // --- Totaux ---
  const t = totals(doc.lignes);
  const boxW = 220, boxX = R - boxW;
  let ty = pdf.lastAutoTable.finalY + 18;
  pdf.setFillColor(...BG);
  pdf.roundedRect(boxX, ty, boxW, 78, 6, 6, "F");
  ty += 20;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...GRAY);
  pdf.text("Total HT", boxX + 14, ty);
  pdf.text(pdfFmt(t.ht), R - 14, ty, { align: "right" });
  ty += 16;
  pdf.text("TVA", boxX + 14, ty);
  pdf.text(pdfFmt(t.tva), R - 14, ty, { align: "right" });
  ty += 10;
  pdf.setDrawColor(...GOLD);
  pdf.setLineWidth(1);
  pdf.line(boxX + 14, ty, R - 14, ty);
  ty += 20;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.setTextColor(...INK);
  pdf.text("Total TTC", boxX + 14, ty);
  pdf.setTextColor(...GOLD);
  pdf.text(pdfFmt(t.ttc), R - 14, ty, { align: "right" });

  // --- Conditions & pied de page ---
  let fy = ty + 46;
  if (entreprise?.conditions) {
    pdf.setDrawColor(...LINE);
    pdf.line(M, fy, R, fy);
    fy += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY);
    pdf.text(pdf.splitTextToSize(entreprise.conditions, R - M), M, fy);
  }
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...LINE);
  pdf.text("Généré via Ma Boîte", (M + R) / 2, pdf.internal.pageSize.getHeight() - 24, { align: "center" });

  pdf.save(`${doc.id}.pdf`);
}
