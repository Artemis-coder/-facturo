// Design tokens for Facturo — palettes clair/sombre exposées en variables CSS.
// Chaque token est référencé via var(--t-*) : le basculement de thème se fait
// instantanément sur toute l'app sans re-render des composants.

export const PALETTES = {
  light: {
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
    hover: "#FAF8F3",
    tabbar: "rgba(255, 255, 255, 0.96)",
    overlay: "rgba(22, 33, 58, 0.36)",
    sidebar: "#16213A",
    invert: "#16213A",
    invertFg: "#FFFFFF",
    goldFg: "#FFFFFF",
    brickSolid: "#AE3B45",
  },
  dark: {
    bg: "#0E1420",
    paper: "#161D2C",
    ink: "#EDF0F6",
    inkSoft: "#9AA3B8",
    line: "#2B3346",
    gold: "#E0A63F",
    goldSoft: "#3B3017",
    teal: "#4CBE97",
    tealSoft: "#143229",
    brick: "#E06A72",
    brickSoft: "#3A2024",
    slate: "#A7B2CB",
    slateSoft: "#242D42",
    hover: "#1C2437",
    tabbar: "rgba(22, 29, 44, 0.96)",
    overlay: "rgba(2, 6, 14, 0.62)",
    sidebar: "#101726",
    invert: "#EDF0F6",
    invertFg: "#101623",
    goldFg: "#221605",
    brickSolid: "#B23A45",
  },
};

const buildVars = (p) => Object.entries(p).map(([k, v]) => `--t-${k}: ${v};`).join(" ");

export const THEME_CSS = `
:root { color-scheme: light; ${buildVars(PALETTES.light)} }
[data-theme="light"] { color-scheme: light; ${buildVars(PALETTES.light)} }
[data-theme="dark"] { color-scheme: dark; ${buildVars(PALETTES.dark)} }
.theme-light, [data-theme="dark"] .theme-light { color-scheme: light; ${buildVars(PALETTES.light)} }
`;

const css = (k) => `var(--t-${k})`;

export const T = {
  bg: css("bg"),
  paper: css("paper"),
  ink: css("ink"),
  inkSoft: css("inkSoft"),
  line: css("line"),
  gold: css("gold"),
  goldSoft: css("goldSoft"),
  teal: css("teal"),
  tealSoft: css("tealSoft"),
  brick: css("brick"),
  brickSoft: css("brickSoft"),
  slate: css("slate"),
  slateSoft: css("slateSoft"),
  hover: css("hover"),
  tabbar: css("tabbar"),
  overlay: css("overlay"),
  sidebar: css("sidebar"),
  invert: css("invert"),
  invertFg: css("invertFg"),
  goldFg: css("goldFg"),
  brickSolid: css("brickSolid"),
};

// équivalent des anciens suffixes hex ("33" = 20%, "66" = 40%, "22" = 13%, "1A" = 10%, "44" = 27%)
export const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// Écran d'accueil / branding : style sombre fixe quel que soit le thème.
export const HERO = {
  bg: "#16213A",
  bgGlow: "#1E2942",
  text: "#FFFFFF",
  muted: "#B9BFCF",
  subtle: "#94A3B8",
  border: "rgba(255, 255, 255, 0.08)",
  chip: "rgba(255, 255, 255, 0.05)",
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
  background: T.paper,
  boxSizing: "border-box",
};

export const td = {
  padding: "12px 18px",
  borderBottom: `1px solid ${T.line}`,
  fontSize: 13,
};
