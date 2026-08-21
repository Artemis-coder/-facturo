import React from "react";
import { T } from "../../lib/theme";

export function Btn({ children, variant = "primary", onClick, icon: Icon, type = "button", small, fullWidth, disabled }) {
  const styles = {
    primary: { bg: T.ink, fg: "#fff", border: T.ink },
    gold: { bg: T.gold, fg: "#fff", border: T.gold },
    ghost: { bg: "transparent", fg: T.ink, border: T.line },
    danger: { bg: "transparent", fg: T.brick, border: T.brickSoft },
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display: fullWidth ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      width: fullWidth ? "100%" : undefined,
      background: styles.bg, color: styles.fg, border: `1px solid ${styles.border}`,
      borderRadius: 10, padding: small ? "7px 12px" : "10px 18px",
      fontSize: small ? 12.5 : 13.5, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, transition: "opacity .15s", boxSizing: "border-box",
    }}
    onMouseOver={(e) => { if (!disabled) e.currentTarget.style.opacity = 0.85; }}
    onMouseOut={(e) => { e.currentTarget.style.opacity = disabled ? 0.4 : 1; }}>
      {Icon && <Icon size={small ? 13 : 15} />}{children}
    </button>
  );
}
