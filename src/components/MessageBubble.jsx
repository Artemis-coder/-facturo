import React, { useMemo } from "react";
import { formatDistanceToNow } from "../lib/helpers";
import { MessageReactions } from "./MessageReactions";
import { FileAttachment } from "./FileAttachment";
import { T, alpha } from "../lib/theme";
import { Reply, Trash2 } from "lucide-react";

export function MessageBubble({
  message,
  currentUserId,
  isOwn,
  reactions,
  onToggleReaction,
  onDelete,
  onMarkAsRead,
  onFileDownload,
  onReply,
  showSender,
}) {
  const timeAgo = useMemo(
    () => formatDistanceToNow(message.createdAt),
    [message.createdAt]
  );

  const messageReactions = reactions.filter((r) => r.messageId === message.id);

  const replyContent = message.metadata?.replyToContent;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        gap: 8,
        marginBottom: 8,
        alignItems: "flex-end",
      }}
      onMouseEnter={() => !isOwn && message.recipientId === currentUserId && onMarkAsRead(message.id)}
    >
      <div style={{
        maxWidth: "75%",
        minWidth: 120,
        position: "relative",
      }}>
        {/* Bulle de message style WhatsApp/Telegram */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 18,
            borderTopLeftRadius: showSender && !isOwn ? 4 : 18,
            borderTopRightRadius: showSender && isOwn ? 4 : 18,
            background: isOwn
              ? `linear-gradient(135deg, ${T.gold}, ${alpha(T.gold, 85)})`
              : T.paper,
            color: isOwn ? "#fff" : T.ink,
            boxShadow: isOwn
              ? `0 2px 8px ${alpha(T.gold, 20)}`
              : `0 1px 3px ${alpha(T.sidebar, 8)}`,
            border: isOwn ? "none" : `1px solid ${T.line}`,
            position: "relative",
          }}
        >
          {/* Citation de réponse */}
          {replyContent && (
            <div style={{
              padding: "8px 10px",
              marginBottom: 8,
              borderRadius: 10,
              background: isOwn ? alpha("#fff", 15) : alpha(T.sidebar, 6),
              borderLeft: isOwn ? "3px solid rgba(255,255,255,0.5)" : `3px solid ${T.gold}`,
              fontSize: 12,
              color: isOwn ? alpha("#fff", 90) : T.inkSoft,
            }}>
              <div style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: 11.5,
              }}>
                {replyContent}
              </div>
            </div>
          )}

          {/* Fichier joint */}
          {message.type === "file" && message.metadata?.filePath && (
            <div style={{ marginBottom: message.contenu ? 8 : 0 }}>
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
            </div>
          )}

          {/* Texte du message */}
          {message.contenu && (
            <div style={{
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {message.contenu}
            </div>
          )}

          {/* Horodatage et statut */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            marginTop: 4,
            fontSize: 10.5,
            color: isOwn ? alpha("#fff", 75) : T.inkSoft,
          }}>
            {timeAgo}
            {message.lu && !isOwn && (
              <span style={{ color: T.teal, fontWeight: 600 }}>• Lu</span>
            )}
            {isOwn && message.statut === "Envoyé" && (
              <span style={{ color: alpha("#fff", 60) }}>✓</span>
            )}
            {isOwn && message.statut === "Signé" && (
              <span style={{ color: T.teal, fontWeight: 600 }}>✓✓</span>
            )}
          </div>
        </div>

        {/* Actions rapides au survol */}
        <div style={{
          display: "flex",
          gap: 4,
          marginTop: 4,
          opacity: 0,
          transition: "opacity 0.2s",
          flexDirection: isOwn ? "row-reverse" : "row",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
        >
          <button
            onClick={() => onReply?.(message)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: T.paper,
              cursor: "pointer",
              color: T.inkSoft,
              boxShadow: `0 1px 3px ${alpha(T.sidebar, 8)}`,
            }}
            title="Répondre"
          >
            <Reply size={12} />
          </button>
          {isOwn && (
            <button
              onClick={() => onDelete(message.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                background: T.paper,
                cursor: "pointer",
                color: T.brick,
                boxShadow: `0 1px 3px ${alpha(T.sidebar, 8)}`,
              }}
              title="Supprimer"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Réactions */}
        {messageReactions.length > 0 && (
          <div style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            marginTop: 4,
            flexDirection: isOwn ? "row-reverse" : "row",
          }}>
            <MessageReactions
              messageId={message.id}
              reactions={messageReactions}
              currentUserId={currentUserId}
              onToggle={onToggleReaction}
            />
          </div>
        )}
      </div>
    </div>
  );
}
