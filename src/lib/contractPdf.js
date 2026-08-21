const INK = [22, 33, 58];
const GOLD = [201, 138, 43];
const GREY = [91, 100, 122];

export async function downloadContractPdf(contract, client, entreprise) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 48;
  let y = 52;
  const addPage = () => { pdf.addPage(); y = 52; };
  const ensure = (space) => { if (y + space > height - 54) addPage(); };

  pdf.setFillColor(...INK); pdf.rect(0, 0, width, 96, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.setTextColor(255, 255, 255);
  pdf.text(entreprise?.nom || "Ma Bouate", margin, 39);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(220, 226, 237);
  pdf.text([entreprise?.email, entreprise?.tel || entreprise?.telephone, entreprise?.adresse].filter(Boolean).join("  ·  ") || "", margin, 55);
  pdf.setTextColor(...GOLD); pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.text("CONTRAT", width - margin, 39, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(220, 226, 237); pdf.text(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, width - margin, 55, { align: "right" });
  y = 125;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(19); pdf.setTextColor(...INK); pdf.text(contract.titre, margin, y);
  y += 22; pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(...GREY);
  pdf.text([client?.societe || client?.nom, contract.typeService].filter(Boolean).join("  ·  "), margin, y);
  y += 30;
  const paragraphs = contract.contenu.split(/\n\s*\n/).filter(Boolean);
  paragraphs.forEach((paragraph) => {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5); pdf.setTextColor(...INK);
    const lines = pdf.splitTextToSize(paragraph.trim(), width - margin * 2);
    ensure(lines.length * 15 + 16); pdf.text(lines, margin, y); y += lines.length * 15 + 16;
  });
  ensure(110); pdf.setDrawColor(...GOLD); pdf.line(margin, y, width - margin, y); y += 22;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...INK); pdf.text("Pour l'entreprise", margin, y); pdf.text("Pour le client", width - margin - 150, y);
  y += 55; pdf.setDrawColor(180, 184, 193); pdf.line(margin, y, margin + 190, y); pdf.line(width - margin - 190, y, width - margin, y);
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) { pdf.setPage(p); pdf.setFontSize(7.5); pdf.setTextColor(...GREY); pdf.text(`Ma Bouate · Contrat · Page ${p}/${pages}`, width / 2, height - 24, { align: "center" }); }
  pdf.save(`${contract.titre.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "contrat"}.pdf`);
}
