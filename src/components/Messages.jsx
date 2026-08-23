import React, { useMemo, useEffect, useRef, useState } from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import { T, alpha } from "../lib/theme";
import { MessageBubble } from "./MessageBubble";
import { useMessages } from "../lib/useMessages";

export function Messages({ entreprise, currentUserId, userRole, prestataire, contract, projet }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const recipientId = prestataire?.userId || contract?.clientId || prestataire?.id;
  const filters = {
    prestataireId: prestataire?.id,
    contractId: contract?.id,
    projetId: projet?.id,
    recipientId: userRole === "prestataire" ? undefined : recipientId,
  };

  const { messages, reactions, loading, unreadCount, toast, sendMessage, toggleReaction, markAsRead, deleteMessage, getMessageReactions, loadMessages } = useMessages(
    entreprise?.id,
    currentUserId,
    userRole
  );

  useEffect(() => {
    loadMessages(filters);
  }, [loadMessages, filters]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    const form = {
      contenu: text.trim(),
      recipientId: userRole === "prestataire" ? undefined : recipientId,
      prestataireId: prestataire?.id,
      contractId: contract?.id,
      projetId: projet?.id,
      file,
      metadata: {},
    };
    const { error } = await sendMessage(form);
    if (!error) {
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDownload = async (attachment) => {
    try {
      const { downloadContractDocument } = await import("../lib/contractPdf");
      await downloadContractDocument(
        attachment.contractId || attachment.messageId,
        "transmitted",
        attachment.fileName || "fichier.pdf"
      );
    } catch (error) {
      console.error("Erreur téléchargement:", error);
    }
  };

  const handleDelete = async (messageId) => {
    await deleteMessage(messageId);
  };

  const conversationMessages = useMemo(() => {
    return messages.filter((m) => {
      if (userRole === "prestataire") {
        return m.prestataireId === prestataire?.id || m.senderId === currentUserId || m.recipientId === currentUserId;
      }
      if (filters.prestataireId) return m.prestataireId === filters.prestataireId;
      if (filters.contractId) return m.contractId === filters.contractId;
      if (filters.projetId) return m.projetId === filters.projetId;
      return true;
    });
  }, [messages, filters, userRole, prestataire?.id, currentUserId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 500, background: T.bg, borderRadius: 12, border: `1px solid ${T.line}` }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
            {userRole === "prestataire" ? "Messages avec l'entreprise" : `Messages${prestataire?.nom ? ` — ${prestataire.nom}` : ""}`}
          </div>
          <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>
            {conversationMessages.length} message{conversationMessages.length > 1 ? "s" : ""}
            {unreadCount > 0 && <span style={{ marginLeft: 8, color: T.gold, fontWeight: 600 }}>{unreadCount} non lu{unreadCount > 1 ? "s" : ""}</span>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: T.inkSoft, padding: 40 }}>Chargement...</div>
        ) : conversationMessages.length === 0 ? (
          <div style={{ textAlign: "center", color: T.inkSoft, padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 13 }}>Aucun message pour le moment.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Envoyez le premier message pour démarrer la conversation.</div>
          </div>
        ) : (
          conversationMessages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            const showSender = !isOwn && conversationMessages.some((m) => m.senderId !== currentUserId && m.senderId !== message.senderId);
            const messageReactions = getMessageReactions(message.id);
            return (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                isOwn={isOwn}
                reactions={messageReactions}
                onToggleReaction={toggleReaction}
                onDelete={handleDelete}
                onMarkAsRead={markAsRead}
                onFileDownload={handleDownload}
                showSender={showSender}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {file && (
        <div style={{ padding: "8px 18px", borderTop: `1px solid ${T.line}`, background: T.paper, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.inkSoft }}>
          <Paperclip size={14} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
          <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}
      {toast && (
        <div style={{ padding: "8px 18px", background: T.goldSoft, borderTop: `1px solid ${T.gold}`, color: T.ink, fontSize: 12, textAlign: "center" }}>
          {toast}
        </div>
      )}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.line}`, display: "flex", gap: 8, alignItems: "flex-end", background: T.paper }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            border: `1px solid ${T.line}`,
            background: T.paper,
            cursor: "pointer",
            color: T.inkSoft,
            flexShrink: 0,
          }}
          title="Joindre un fichier"
        >
          <Paperclip size={16} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrivez votre message..."
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            border: `1px solid ${T.line}`,
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 13.5,
            lineHeight: 1.5,
            background: T.bg,
            color: T.ink,
            outline: "none",
            fontFamily: "inherit",
            minHeight: 38,
            maxHeight: 120,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() && !file}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: (!text.trim() && !file) ? T.line : T.invert,
            color: (!text.trim() && !file) ? T.inkSoft : T.invertFg,
            cursor: (!text.trim() && !file) ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
          title="Envoyer"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
