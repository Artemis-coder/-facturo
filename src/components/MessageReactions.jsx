import React, { useState } from "react";
import { Smile, Trash2 } from "lucide-react";
import { T } from "../lib/theme";

const QUICK_EMOJIS = ["👍", "❤️", "😊", "🎉", "👀", "✅"];

export function MessageReactions({ messageId, reactions, currentUserId, onToggle }) {
  const [showPicker, setShowPicker] = useState(false);

  const grouped = reactions.reduce((acc, r) => {
    const key = r.emoji;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, position: "relative" }}>
      {Object.entries(grouped).map(([emoji, emojiReactions]) => {
        const hasMine = emojiReactions.some((r) => r.userId === currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => onToggle(messageId, emoji)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 8px",
              borderRadius: 12,
              border: `1px solid ${hasMine ? T.gold : T.line}`,
              background: hasMine ? T.goldSoft : T.paper,
              fontSize: 12,
              cursor: "pointer",
              lineHeight: 1.4,
              color: T.inkSoft,
            }}
          >
            <span>{emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{emojiReactions.length}</span>
          </button>
        );
      })}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `1px solid ${T.line}`,
            background: T.paper,
            cursor: "pointer",
            color: T.inkSoft,
            padding: 0,
          }}
        >
          <Smile size={12} />
        </button>
        {showPicker && (
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: 0,
              display: "flex",
              gap: 4,
              padding: 6,
              borderRadius: 10,
              border: `1px solid ${T.line}`,
              background: T.paper,
              boxShadow: `0 4px 12px ${T.overlay}`,
              zIndex: 20,
            }}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onToggle(messageId, emoji);
                  setShowPicker(false);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: 0,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
