import { pdfFmt } from "./pdfFormat";
import { ligneMontant, totals } from "./helpers";

const INK = [22, 33, 58];
const INK_SOFT = [91, 100, 122];
const LINE = [217, 214, 204];

export async function genererDocumentPDF(doc, type, client, entreprise) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const rightX = pageWidth - marginX;

  // --- En-tête entreprise (gauche) ---
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...INK);
  pdf.text(entreprise?.nom || "", marginX, 55);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK_SOFT);
  let leftY = 72;
  [entreprise?.adresse, entreprise?.tel, `RCCM ${entreprise?.rccm || "—"} · NIF ${entreprise?.nif || "—"}`]
    .filter(Boolean)
    .forEach((line) => { pdf.text(line, marginX, leftY); leftY += 13; });

  // --- Type de document + numéro (droite) ---
  const label = type === "devis" ? "DEVIS" : "FACTURE";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(...INK);
  pdf.text(label, rightX, 55, { align: "right" });

  pdf.setFont("courier", "normal");
  pdf.setFontSize(10);
  pdf.text(doc.id, rightX, 70, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK_SOFT);
  let rightY = 84;
  pdf.text(`Date : ${doc.date}`, rightX, rightY, { align: "right" });
  if (doc.echeance) { rightY += 13; pdf.text(`Échéance : ${doc.echeance}`, rightX, rightY, { align: "right" }); }

  // --- Client ---
  let y = 130;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...INK_SOFT);
  pdf.text("FACTURÉ À", marginX, y);
  y += 15;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text(client?.societe || "", marginX, y);
  y += 14;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK_SOFT);
  pdf.text([client?.nom, client?.email, client?.tel].filter(Boolean).join(" · "), marginX, y);

  // --- Tableau des lignes (+ détails de prestation indentés) ---
  const body = [];
  doc.lignes.forEach((l) => {
    body.push([
      { content: l.nom, styles: { fontStyle: l.details?.length ? "bold" : "normal" } },
      String(l.qty),
      `${l.remise}%`,
      pdfFmt(ligneMontant(l)),
    ]);
    (l.details || []).forEach((d) => {
      body.push([
        { content: `—  ${d.label || "Élément sans nom"}`, styles: { textColor: INK_SOFT, fontSize: 8.5 } },
        "", "",
        { content: pdfFmt(Number(d.prix || 0)), styles: { textColor: INK_SOFT, fontSize: 8.5 } },
      ]);
    });
  });

  autoTable(pdf, {
    startY: y + 20,
    head: [["Désignation", "Qté", "Remise", "Total"]],
    body,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 6, lineColor: LINE, lineWidth: 0.5 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 50 }, 2: { halign: "right", cellWidth: 60 }, 3: { halign: "right", cellWidth: 90 } },
  });

  // --- Totaux ---
  const t = totals(doc.lignes);
  let ty = pdf.lastAutoTable.finalY + 24;
  const labelX = rightX - 160;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...INK_SOFT);
  pdf.text("Total HT", labelX, ty);
  pdf.text(pdfFmt(t.ht), rightX, ty, { align: "right" });
  ty += 16;
  pdf.text("TVA", labelX, ty);
  pdf.text(pdfFmt(t.tva), rightX, ty, { align: "right" });
  ty += 6;
  pdf.setDrawColor(...INK);
  pdf.line(labelX, ty, rightX, ty);
  ty += 16;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...INK);
  pdf.text("Total TTC", labelX, ty);
  pdf.text(pdfFmt(t.ttc), rightX, ty, { align: "right" });

  // --- Conditions générales ---
  if (entreprise?.conditions) {
    ty += 40;
    pdf.setDrawColor(...LINE);
    pdf.line(marginX, ty, rightX, ty);
    ty += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...INK_SOFT);
    const wrapped = pdf.splitTextToSize(entreprise.conditions, rightX - marginX);
    pdf.text(wrapped, marginX, ty);
  }

  pdf.save(`${doc.id}.pdf`);
}
