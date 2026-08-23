import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { Paperclip, Send, Smile, Search, X, Reply, ArrowDown } from "lucide-react";
import { T, alpha } from "../lib/theme";
import { MessageBubble } from "./MessageBubble";
import { useMessages } from "../lib/useMessages";

const QUICK_EMOJIS = ["👍", "❤️", "😊", "🎉", "👀", "✅"];

export function Messages({ entreprise, currentUserId, userRole, prestataire, contract, projet }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

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
    if (messages.length > 0 && !searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchQuery((q) => !q && searchInputRef.current ? searchInputRef.current.focus() : q);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    const form = {
      contenu: text.trim(),
      recipientId: userRole === "prestataire" ? undefined : recipientId,
      prestataireId: prestataire?.id,
      contractId: contract?.id,
      projetId: projet?.id,
      file,
      metadata: replyingTo ? { replyToId: replyingTo.id, replyToContent: replyingTo.contenu || (replyingTo.metadata?.fileName ? "📎 Fichier joint" : "Message") } : {},
    };
    const { error } = await sendMessage(form);
    if (!error) {
      setText("");
      setFile(null);
      setReplyingTo(null);
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

  const handleReply = (message) => {
    setReplyingTo(message);
    setText("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const conversationMessages = useMemo(() => {
    let filtered = messages.filter((m) => {
      if (userRole === "prestataire") {
        return m.prestataireId === prestataire?.id || m.senderId === currentUserId || m.recipientId === currentUserId;
      }
      if (filters.prestataireId) return m.prestataireId === filters.prestataireId;
      if (filters.contractId) return m.contractId === filters.contractId;
      if (filters.projetId) return m.projetId === filters.projetId;
      return true;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.contenu.toLowerCase().includes(query));
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [messages, filters, userRole, prestataire?.id, currentUserId, searchQuery]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    conversationMessages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt);
      messageDate.setHours(0, 0, 0, 0);
      let dateLabel;
      if (messageDate.getTime() === today.getTime()) {
        dateLabel = "Aujourd'hui";
      } else if (messageDate.getTime() === yesterday.getTime()) {
        dateLabel = "Hier";
      } else {
        dateLabel = messageDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      }

      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.date !== dateLabel) {
        groups.push({ date: dateLabel, messages: [message] });
      } else {
        lastGroup.messages.push(message);
      }
    });

    return groups;
  }, [conversationMessages]);

  const getSenderName = useCallback((senderId) => {
    if (senderId === currentUserId) return "Vous";
    return senderId || "Utilisateur";
  }, [currentUserId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 500, background: T.bg, borderRadius: 12, border: `1px solid ${T.line}` }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
            {userRole === "prestataire" ? "Messages avec l'entreprise" : `Messages${prestataire?.nom ? ` — ${prestataire.nom}` : ""}`}
          </div>
          <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>
            {conversationMessages.length} message{conversationMessages.length > 1 ? "s" : ""}
            {unreadCount > 0 && <span style={{ marginLeft: 8, color: T.gold, fontWeight: 600 }}>{unreadCount} non lu{unreadCount > 1 ? "s" : ""}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {conversationMessages.length > 5 && (
            <button
              onClick={scrollToBottom}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${T.line}`,
                background: T.paper,
                cursor: "pointer",
                color: T.inkSoft,
              }}
              title="Aller au dernier message"
            >
              <ArrowDown size={14} />
            </button>
          )}
          <button
            onClick={() => searchInputRef.current?.focus()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${T.line}`,
              background: T.paper,
              cursor: "pointer",
              color: T.inkSoft,
            }}
            title="Rechercher (Ctrl+K)"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {searchQuery && (
        <div style={{ padding: "8px 18px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 8, background: T.paper }}>
          <Search size={14} style={{ color: T.inkSoft, flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les messages..."
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 13,
              color: T.ink,
              outline: "none",
              padding: "6px 0",
            }}
          />
          <button
            onClick={() => setSearchQuery("")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: T.inkSoft,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", padding: 18 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: T.inkSoft, padding: 40 }}>Chargement...</div>
        ) : conversationMessages.length === 0 ? (
          <div style={{ textAlign: "center", color: T.inkSoft, padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 13 }}>{searchQuery ? "Aucun résultat" : "Aucun message pour le moment."}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{searchQuery ? "Essayez un autre terme" : "Envoyez le premier message pour démarrer la conversation."}</div>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date} style={{ marginBottom: 24 }}>
              <div style={{
                textAlign: "center",
                fontSize: 10.5,
                fontWeight: 600,
                color: T.inkSoft,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 16,
                position: "relative",
              }}>
                <span style={{
                  background: T.bg,
                  padding: "0 12px",
                  position: "relative",
                  zIndex: 1,
                }}>
                  {group.date}
                </span>
                <span style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 1,
                  background: T.line,
                  zIndex: 0,
                }} />
              </div>
              {group.messages.map((message) => {
                const isOwn = message.senderId === currentUserId;
                const showSender = !isOwn && group.messages.some((m) => m.senderId !== currentUserId && m.senderId !== message.senderId);
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
                    onReply={handleReply}
                    showSender={showSender}
                    getSenderName={getSenderName}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyingTo && (
        <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.line}`, background: T.paper, display: "flex", alignItems: "center", gap: 10 }}>
          <Reply size={14} style={{ color: T.inkSoft, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.inkSoft, fontWeight: 600 }}>En réponse à {getSenderName(replyingTo.senderId)}</div>
            <div style={{ fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
              {replyingTo.contenu || (replyingTo.metadata?.fileName ? "📎 Fichier joint" : "Message")}
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: T.inkSoft,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
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
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={replyingTo ? `En réponse à ${getSenderName(replyingTo.senderId)}...` : "Écrivez votre message..."}
            rows={1}
            style={{
              width: "100%",
              resize: "none",
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              padding: "9px 36px 9px 12px",
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
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: T.inkSoft,
              padding: 0,
            }}
            title="Emojis"
          >
            <Smile size={16} />
          </button>
          {showEmojiPicker && (
            <div
              style={{
                position: "absolute",
                bottom: 44,
                right: 0,
                display: "flex",
                gap: 4,
                padding: 8,
                borderRadius: 10,
                border: `1px solid ${T.line}`,
                background: T.paper,
                boxShadow: `0 4px 12px ${alpha(T.sidebar, 16)}`,
                zIndex: 20,
              }}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setText((t) => t + emoji);
                    setShowEmojiPicker(false);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 18,
                    padding: 0,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
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
