import { pdfFmt } from "./pdfFormat";
import { ligneMontant, totals } from "./helpers";

const INK = [22, 33, 58];
const GOLD = [201, 138, 43];
const TEAL = [31, 122, 99];
const BRICK = [174, 59, 69];
const SLATE = [92, 107, 138];
const INK_SOFT = [140, 148, 165];
const GRAY = [91, 100, 122];
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
  const M = 40;
  const R = W - M;

  // --- En-tête Moderne & Élégant ---
  pdf.setFillColor(...INK);
  pdf.rect(0, 0, W, 100, "F");

  // Logo Badge
  pdf.setFillColor(...GOLD);
  pdf.roundedRect(M, 24, 34, 34, 6, 6, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.text("M", M + 17, 48, { align: "center" });

  // Entreprise Nom & Coordonnées
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text(entreprise?.nom || "Ma Bouate", M + 44, 40);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INK_SOFT);
  const entSub = [
    entreprise?.email,
    entreprise?.tel || entreprise?.telephone,
    entreprise?.adresse,
    entreprise?.rccm && `RCCM: ${entreprise.rccm}`,
    entreprise?.nif && `NIF: ${entreprise.nif}`
  ].filter(Boolean).join("   ·   ");
  pdf.text(entSub || "contact@mabouate.com", M + 44, 54);

  // Titre Document (DEVIS / FACTURE) & Numéro
  const docType = type || (doc.id?.startsWith("DEV") ? "devis" : "facture");
  const label = docType === "devis" ? "DEVIS" : "FACTURE";

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...GOLD);
  pdf.text(label, R, 38, { align: "right" });

  pdf.setFont("courier", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(doc.id || "#DEV-0000", R, 54, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INK_SOFT);
  const infoLine = [`Date : ${doc.date || new Date().toISOString().slice(0, 10)}`, doc.echeance && `Échéance : ${doc.echeance}`].filter(Boolean).join("   ·   ");
  pdf.text(infoLine, R, 68, { align: "right" });

  // Pastille Statut
  if (doc.statut) {
    const sc = STATUT_COLOR[doc.statut] || SLATE;
    pdf.setFillColor(...sc);
    const label2 = doc.statut.toUpperCase();
    const bw = pdf.getTextWidth(label2) + 16;
    pdf.roundedRect(R - bw, 78, bw, 14, 7, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(label2, R - bw / 2, 87.5, { align: "center" });
  }

  // --- Bloc Client ---
  let y = 120;
  pdf.setFillColor(...BG);
  pdf.roundedRect(M, y, R - M, 58, 8, 8, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...GOLD);
  pdf.text("DESTINATAIRE (FACTURÉ À)", M + 14, y + 18);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...INK);
  pdf.text(client?.societe || client?.nom || "Client Destinataire", M + 14, y + 34);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...GRAY);
  const clientInfo = [client?.societe && client?.nom && `Attn: ${client.nom}`, client?.email, client?.tel || client?.telephone].filter(Boolean).join("   ·   ");
  pdf.text(clientInfo || "Aucun contact spécifié", M + 14, y + 48);

  // --- Tableau des lignes ---
  const body = [];
  (doc.lignes || []).forEach((l) => {
    body.push([
      l.nom || "Prestation",
      String(l.qty || 1),
      pdfFmt(l.prixHT || 0),
      l.remise ? `${l.remise}%` : "—",
      pdfFmt(ligneMontant(l))
    ]);
    if (l.description) {
      body.push([{ content: l.description, colSpan: 5, styles: { textColor: GRAY, fontStyle: "italic", fontSize: 8.5, fillColor: 255 } }]);
    }
  });

  autoTable(pdf, {
    startY: y + 72,
    head: [["Description", "Qté", "Prix HT", "Remise", "Total"]],
    body,
    margin: { left: M, right: M },
    styles: { fontSize: 9, textColor: INK, cellPadding: 7, lineColor: LINE, lineWidth: 0.4 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: BG },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 40 },
      2: { halign: "right", cellWidth: 70 },
      3: { halign: "right", cellWidth: 50 },
      4: { halign: "right", cellWidth: 80 }
    },
  });

  // --- Totaux ---
  const remiseGlobale = Number(doc.remiseGlobale || 0);
  const t = totals(doc.lignes || [], remiseGlobale);

  const boxW = 230, boxX = R - boxW;
  let ty = pdf.lastAutoTable.finalY + 16;
  const boxH = remiseGlobale > 0 ? 94 : 78;

  pdf.setFillColor(...BG);
  pdf.roundedRect(boxX, ty, boxW, boxH, 8, 8, "F");

  let textY = ty + 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...GRAY);
  pdf.text("Sous-total HT", boxX + 14, textY);
  pdf.text(pdfFmt(t.htBrut || t.ht), R - 14, textY, { align: "right" });

  if (remiseGlobale > 0) {
    textY += 16;
    pdf.setTextColor(...BRICK);
    pdf.text(`Remise globale (${remiseGlobale}%)`, boxX + 14, textY);
    pdf.text(`-${pdfFmt((t.htBrut || t.ht) * (remiseGlobale / 100))}`, R - 14, textY, { align: "right" });
  }

  textY += 16;
  pdf.setTextColor(...GRAY);
  pdf.text("TVA (18%)", boxX + 14, textY);
  pdf.text(pdfFmt(t.tva), R - 14, textY, { align: "right" });

  textY += 10;
  pdf.setDrawColor(...GOLD);
  pdf.setLineWidth(1);
  pdf.line(boxX + 14, textY, R - 14, textY);

  textY += 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...INK);
  pdf.text("Total TTC", boxX + 14, textY);
  pdf.setTextColor(...GOLD);
  pdf.text(`${pdfFmt(t.ttc)} ${doc.devise && doc.devise !== "FCFA" ? doc.devise : ""}`, R - 14, textY, { align: "right" });

  // --- Conditions & Pied de page ---
  let fy = Math.max(pdf.lastAutoTable.finalY + boxH + 30, textY + 40);

  const notesText = doc.notes || entreprise?.conditions;
  if (notesText) {
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.5);
    pdf.line(M, fy, R, fy);
    fy += 16;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...GOLD);
    pdf.text("CONDITIONS DE RÈGLEMENT & NOTES", M, fy);
    fy += 12;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY);
    const splitNotes = pdf.splitTextToSize(notesText, R - M);
    pdf.text(splitNotes, M, fy);
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...LINE);
  pdf.text("Généré via Ma Bouate", (M + R) / 2, pdf.internal.pageSize.getHeight() - 20, { align: "center" });

  pdf.save(`${doc.id || "document"}.pdf`);
}
