import React, { useMemo } from "react";
import { formatDistanceToNow } from "../lib/helpers";
import { MessageReactions } from "./MessageReactions";
import { FileAttachment } from "./FileAttachment";
import { T, alpha } from "../lib/theme";

export function MessageBubble({
  message,
  currentUserId,
  isOwn,
  reactions,
  onToggleReaction,
  onDelete,
  onMarkAsRead,
  onFileDownload,
  showSender,
}) {
  const timeAgo = useMemo(
    () => formatDistanceToNow(message.createdAt),
    [message.createdAt]
  );

  const messageReactions = reactions.filter((r) => r.messageId === message.id);

  const senderLabel = isOwn
    ? "Vous"
    : message.senderId === currentUserId
      ? "Vous"
      : message.senderId || "Utilisateur";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        gap: 10,
        marginBottom: 16,
        alignItems: "flex-start",
      }}
      onMouseEnter={() => !isOwn && message.recipientId === currentUserId && onMarkAsRead(message.id)}
    >
      {showSender && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: isOwn ? T.gold : T.teal,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          {senderLabel.charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth: "75%", minWidth: 180 }}>
        {showSender && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.inkSoft,
              marginBottom: 4,
              textAlign: isOwn ? "right" : "left",
            }}
          >
            {senderLabel}
          </div>
        )}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            borderTopLeftRadius: showSender && !isOwn ? 4 : 14,
            borderTopRightRadius: showSender && isOwn ? 4 : 14,
            background: isOwn ? T.invert : T.paper,
            color: isOwn ? T.invertFg : T.ink,
            border: `1px solid ${isOwn ? T.invert : T.line}`,
            boxShadow: `0 1px 2px ${alpha(T.sidebar, 8)}`,
          }}
        >
          {message.type === "file" && message.metadata?.filePath && (
            <FileAttachment
              attachment={{
                fileName: message.metadata.fileName,
                fileSize: message.metadata.fileSize,
                mimeType: message.metadata.mimeType,
                filePath: message.metadata.filePath,
                messageId: message.id,
                contractId: message.contractId,
              }}
              onDownload={onFileDownload}
            />
          )}
          {message.contenu && (
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {message.contenu}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 5,
            flexDirection: isOwn ? "row-reverse" : "row",
          }}
        >
          <span style={{ fontSize: 10.5, color: T.inkSoft }}>
            {timeAgo}
            {message.lu && !isOwn && <span style={{ marginLeft: 6, color: T.teal }}>• Lu</span>}
          </span>
          {isOwn && (
            <button
              onClick={() => onDelete(message.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.brick,
                padding: 0,
                display: "flex",
                opacity: 0.6,
              }}
              title="Supprimer"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <MessageReactions
          messageId={message.id}
          reactions={messageReactions}
          currentUserId={currentUserId}
          onToggle={onToggleReaction}
        />
      </div>
    </div>
  );
}
