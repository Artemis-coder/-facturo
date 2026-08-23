const INK = [22, 33, 58];
const GOLD = [201, 138, 43];
const GREY = [91, 100, 122];
const SIGNATURE_INK = [31, 122, 99];
import { supabase } from "./supabaseClient";

const getFunctionUrl = () => {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  return `${supabaseUrl}/functions/v1/contract-document`;
};

export async function downloadContractPdf(contract, client, entreprise, options = {}) {
  const { jsPDF } = await import("jspdf");
  const { signed = false, signatureDate = null, signerName = null } = options;
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
  if (signed) {
    pdf.setTextColor(...SIGNATURE_INK); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
    pdf.text("SIGNÉ ÉLECTRONIQUEMENT", width - margin, 70, { align: "right" });
    if (signatureDate) {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(220, 226, 237);
      pdf.text(`Signé le ${new Date(signatureDate).toLocaleDateString("fr-FR")}`, width - margin, 82, { align: "right" });
    }
  }
  y = signed ? 145 : 125;
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
  if (signed) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...SIGNATURE_INK);
    pdf.text("Signature électronique", margin, y);
    pdf.text("Signature électronique", width - margin - 150, y);
    y += 55; pdf.setDrawColor(180, 184, 193); pdf.line(margin, y, margin + 190, y); pdf.line(width - margin - 190, y, width - margin, y);
    y += 14; pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(...GREY);
    pdf.text(signerName ? `Signé par ${signerName}` : "Signé électroniquement", margin, y);
    pdf.text(signerName ? `Signé par ${signerName}` : "Signé électroniquement", width - margin - 150, y);
    y += 12; pdf.setTextColor(150, 150, 150);
    pdf.text(`Certificat : ${contract.id}`, margin, y); pdf.text(`Certificat : ${contract.id}`, width - margin - 150, y);
  } else {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...INK); pdf.text("Pour l'entreprise", margin, y); pdf.text("Pour le client", width - margin - 150, y);
    y += 55; pdf.setDrawColor(180, 184, 193); pdf.line(margin, y, margin + 190, y); pdf.line(width - margin - 190, y, width - margin, y);
  }
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) { pdf.setPage(p); pdf.setFontSize(7.5); pdf.setTextColor(...GREY); pdf.text(`Ma Bouate · Contrat · Page ${p}/${pages}`, width / 2, height - 24, { align: "center" }); }
  const filename = `${contract.titre.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "contrat"}${signed ? "-signe" : ""}.pdf`;
  pdf.save(filename);
  return { pdf, filename };
}

export async function downloadContractDocument(contractId, version = "transmitted", filename) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const functionUrl = getFunctionUrl();
  const url = `${functionUrl}?contract_id=${encodeURIComponent(contractId)}&version=${encodeURIComponent(version)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Erreur HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const blobFilename = filename || `contrat-${contractId}.pdf`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = blobFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
