// Design tokens for Facturo — a bespoke ledger/financial palette
// rather than generic SaaS defaults.
export const T = {
  bg: "#EDEFE9",
  paper: "#FFFFFF",
  ink: "#16213A",
  inkSoft: "#5B647A",
  line: "#D9D6CC",
  gold: "#C98A2B",
  goldSoft: "#F3E3C6",
  teal: "#1F7A63",
  tealSoft: "#DCEDE6",
  brick: "#AE3B45",
  brickSoft: "#F3DCDE",
  slate: "#5C6B8A",
  slateSoft: "#E4E7F0",
};

let hideAmounts = false;
export const setAmountsHidden = (v) => { hideAmounts = v; };

export const fmt = (n) =>
  hideAmounts ? "•••• ••• FCFA" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " FCFA";

export const inputStyle = {
  width: "100%",
  height: 40,
  border: `1px solid ${T.line}`,
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 13.5,
  fontFamily: "'IBM Plex Sans', sans-serif",
  color: T.ink,
  background: "#fff",
  boxSizing: "border-box",
};

export const td = {
  padding: "12px 18px",
  borderBottom: `1px solid ${T.line}`,
  fontSize: 13,
};
