import React from "react";
import { Search } from "lucide-react";
import { T, inputStyle } from "../../lib/theme";
import { Card } from "./Card";

export function TableShell({ headers, children, onSearch, searchPlaceholder, action }) {
  return (
    <Card>
      <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 160, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: T.inkSoft }} />
          <input onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} style={{ ...inputStyle, paddingLeft: 30, width: "100%" }} />
        </div>
        {action}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: T.inkSoft, padding: "10px 18px", borderBottom: `1px solid ${T.line}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}
