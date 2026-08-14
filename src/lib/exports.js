import { pdfFmt } from "./pdfFormat";

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// headers: string[], rows: array of arrays (already formatted as strings/numbers)
export function exportCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  // BOM UTF-8 pour qu'Excel/LibreOffice affichent correctement les accents.
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(filename, blob);
}

export async function exportExcel(filename, sheetName, headers, rows) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

const INK = [22, 33, 58];
const INK_SOFT = [91, 100, 122];

// Rapport financier : synthèse (CA encaissé, TVA) + ventilation par client.
export async function exportRapportPDF({ entreprise, totalEncaisse, totalTVA, parClient }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const rightX = pdf.internal.pageSize.getWidth() - marginX;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...INK);
  pdf.text(entreprise?.nom || "Ma Boîte", marginX, 55);

  pdf.setFontSize(13);
  pdf.text("Rapport financier", rightX, 55, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK_SOFT);
  pdf.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, rightX, 70, { align: "right" });

  let y = 110;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK_SOFT);
  pdf.text("Montant total encaissé (paiements partiels inclus)", marginX, y);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...INK);
  pdf.text(pdfFmt(totalEncaisse), marginX, y + 18);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...INK_SOFT);
  pdf.text("TVA collectée (toutes factures)", marginX + 260, y);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...INK);
  pdf.text(pdfFmt(totalTVA), marginX + 260, y + 18);

  autoTable(pdf, {
    startY: y + 50,
    head: [["Client", "Montant encaissé"]],
    body: parClient.map(({ nom, total }) => [nom, pdfFmt(total)]),
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 6 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" } },
  });

  pdf.save(`rapport-financier-${new Date().toISOString().slice(0, 10)}.pdf`);
}
