import React from "react";
import { T } from "../../lib/theme";

export function Spinner({ size = 22, color = T.gold }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2.5px solid ${color}33`, borderTopColor: color,
      animation: "facturo-spin .7s linear infinite",
    }} />
  );
}

export function LoadingState({ label = "Chargement…", light = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 20px" }}>
      <Spinner color={light ? "#fff" : T.gold} />
      <div style={{ fontSize: 13, color: light ? "#B9BFCF" : T.inkSoft }}>{label}</div>
    </div>
  );
}
