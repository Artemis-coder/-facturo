import React from "react";
import { T } from "../../lib/theme";
import { Card } from "./Card";

export function KpiBar({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className="grid-kpi"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${items.length > 4 ? "180px" : "200px"}, 1fr))`,
        gap: 14,
        marginBottom: 20
      }}
    >
      {items.map((k, i) => {
        const Icon = k.icon;
        const toneColor = k.tone || T.ink;
        return (
          <Card
            key={i}
            onClick={k.onClick}
            style={{
              padding: "16px 18px",
              borderLeft: `4px solid ${toneColor}`,
              cursor: k.onClick ? "pointer" : "default",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: T.inkSoft, fontWeight: 500 }}>{k.label}</span>
              {Icon && <Icon size={16} color={toneColor} style={{ opacity: 0.9 }} />}
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink }}>
              {k.value}
            </div>
            {k.sub && (
              <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 4 }}>
                {k.sub}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
