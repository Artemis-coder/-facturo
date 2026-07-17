import React from "react";
import { ChevronDown } from "lucide-react";
import { T, inputStyle } from "../../lib/theme";

export function Select({ value, onChange, children, style, wrapperStyle }) {
  return (
    <div style={{ position: "relative", ...wrapperStyle }}>
      <select value={value} onChange={onChange} style={{
        ...inputStyle, appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
        paddingRight: 34, cursor: "pointer", ...style,
      }}>
        {children}
      </select>
      <ChevronDown size={15} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: T.inkSoft, pointerEvents: "none" }} />
    </div>
  );
}
