import React, { useEffect, useRef } from "react";
import { Sun, Moon, Clock } from "lucide-react";
import { T } from "../lib/theme";
import { useTheme } from "../lib/useTheme";

export function ThemeToggle({ size = 17 }) {
  const { pref, resolved, toggle } = useTheme();
  const btnRef = useRef(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    el.setAttribute("aria-pressed", String(resolved === "dark"));
  }, [resolved]);

  const isAuto = pref === "auto";
  const nextLabel = isAuto
    ? "Forcer le mode clair"
    : resolved === "dark"
      ? "Forcer le mode clair"
      : "Forcer le mode sombre";
  const titleText = isAuto
    ? `Automatique (${resolved === "dark" ? "sombre" : "clair"})`
    : resolved === "dark"
      ? "Mode sombre (manuel)"
      : "Mode clair (manuel)";

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      type="button"
      aria-label={nextLabel}
      title={titleText}
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
        color: resolved === "dark" ? T.gold : T.inkSoft,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <IconSwap isDark={resolved === "dark"} isAuto={isAuto} size={size} />
    </button>
  );
}

function IconSwap({ isDark, isAuto, size }) {
  const common = {
    style: {
      gridArea: "1 / 1",
      transition: "transform .35s cubic-bezier(.2,.8,.3,1), opacity .28s ease",
    },
  };
  return (
    <span style={{ display: "grid", placeItems: "center", width: size + 4, height: size + 4, position: "relative" }}>
      {isAuto && (
        <span {...common} style={{ ...common.style, transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(.4)", opacity: isDark ? 1 : 0, position: "absolute" }}>
          <Moon size={size} />
        </span>
      )}
      {isAuto && (
        <span {...common} style={{ ...common.style, transform: isDark ? "rotate(90deg) scale(.4)" : "rotate(0deg) scale(1)", opacity: isDark ? 0 : 1, position: "absolute" }}>
          <Sun size={size} />
        </span>
      )}
      {isAuto && (
        <Clock size={10} style={{ position: "absolute", bottom: 2, right: 2, opacity: 0.8 }} />
      )}
      {!isAuto && (
        <>
          <span {...common} style={{ ...common.style, transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(.4)", opacity: isDark ? 1 : 0, position: "absolute" }}>
            <Moon size={size} />
          </span>
          <span {...common} style={{ ...common.style, transform: isDark ? "rotate(90deg) scale(.4)" : "rotate(0deg) scale(1)", opacity: isDark ? 0 : 1, position: "absolute" }}>
            <Sun size={size} />
          </span>
        </>
      )}
    </span>
  );
}
