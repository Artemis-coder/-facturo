import React, { useEffect, useRef } from "react";
import { Sun, Moon } from "lucide-react";
import { T } from "../lib/theme";
import { useTheme } from "../lib/useTheme";

// Bouton compact (aligné sur les autres actions du header, 36x36).
// Croisement fluide soleil/lune : rotation + fondu. Accessible (aria-label, title).
export function ThemeToggle({ size = 17 }) {
  const { isDark, toggle } = useTheme();
  const btnRef = useRef(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    el.setAttribute("aria-pressed", String(isDark));
  }, [isDark]);

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      type="button"
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      style={{
        background: "none",
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: isDark ? T.gold : T.inkSoft,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <IconSwap isDark={isDark} size={size} />
    </button>
  );
}

// Un conteneur unique qui superpose les deux icônes et les fait pivoter/fondre.
function IconSwap({ isDark, size }) {
  const common = {
    style: {
      gridArea: "1 / 1",
      transition: "transform .35s cubic-bezier(.2,.8,.3,1), opacity .28s ease",
    },
  };
  return (
    <span style={{ display: "grid", placeItems: "center", width: size + 4, height: size + 4 }}>
      <span {...common} style={{ ...common.style, transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(.4)", opacity: isDark ? 1 : 0 }}>
        <Moon size={size} />
      </span>
      <span {...common} style={{ ...common.style, transform: isDark ? "rotate(90deg) scale(.4)" : "rotate(0deg) scale(1)", opacity: isDark ? 0 : 1 }}>
        <Sun size={size} />
      </span>
    </span>
  );
}
