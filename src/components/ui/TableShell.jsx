import React from "react";
import { Search } from "lucide-react";
import { T, inputStyle } from "../../lib/theme";
import { useIsMobile } from "../../lib/useIsMobile";
import { Card } from "./Card";

export function TableShell({ headers, children, onSearch, searchPlaceholder, action, items, renderCard, mobileEmpty }) {
  const isMobile = useIsMobile();
  const showCards = isMobile && Boolean(renderCard);
  return (
    <Card>
      <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: `1px solid ${T.line}` }}>
        {onSearch ? (
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 160, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: T.inkSoft }} />
            <input onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} style={{ ...inputStyle, paddingLeft: 30, width: "100%" }} />
          </div>
        ) : <div />}
        {action}
      </div>
      {showCards ? (
        <div className="table-cards">
          {items?.length > 0
            ? items.map((item) => <div key={item.key != null ? item.key : item.id}>{renderCard(item)}</div>)
            : null}
          {(!items || items.length === 0) && (mobileEmpty || null)}
        </div>
      ) : (
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
      )}
    </Card>
  );
}
