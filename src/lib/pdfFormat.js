// Intl.NumberFormat('fr-FR') inserts a Unicode "narrow no-break space"
// (U+202F) as the thousands separator, which jsPDF's built-in fonts don't
// reliably render (shows as a missing-glyph box). This formatter produces
// the same visual grouping using a plain space, safe for PDF output.
export function pdfFmt(n) {
  const rounded = Math.round(Number(n) || 0);
  const withSpaces = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (rounded < 0 ? "-" : "") + withSpaces + " FCFA";
}
