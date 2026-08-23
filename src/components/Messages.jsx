import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { Paperclip, Send, Smile, Search, X, Reply, ArrowDown } from "lucide-react";
import { T, alpha } from "../lib/theme";
import { MessageBubble } from "./MessageBubble";
import { ConversationList } from "./ConversationList";
import { useMessages } from "../lib/useMessages";
import { telechargerChatAttachment } from "../lib/fichierUtils";
import { Toast } from "./ui";

const QUICK_EMOJIS = ["👍", "❤️", "😊", "🎉", "👀", "✅", "🔥", "👏"];

export function Messages({ entreprise, currentUserId, userRole, prestataire, contract, projet }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const recipientId = prestataire?.userId || contract?.clientId || prestataire?.id;

  const { messages, reactions, loading, unreadCount, toast, showToast, sendMessage, toggleReaction, markAsRead, deleteMessage, getMessageReactions, loadMessages, loadConversations, loadParticipants } = useMessages(
    entreprise?.id,
    currentUserId,
    userRole
  );

  useEffect(() => {
    loadConversations().then((convs) => {
      setConversations(convs);
      setLoadingConversations(false);
    });
    loadParticipants().then(setParticipants);
  }, [loadConversations, loadParticipants]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages({ recipientId: selectedConversation });
    }
  }, [selectedConversation, loadMessages]);

  const dernierMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    // À l'ouverture d'une conversation, on scrolle directement en bas du fil.
    if (!selectedConversation) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [selectedConversation]);

  useEffect(() => {
    // Si l'utilisateur a remonté le fil pour relire, on ne le force pas à redescendre.
    const container = messagesContainerRef.current;
    if (!container || !dernierMessageId) return;
    const procheDuBas = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (procheDuBas) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [dernierMessageId]);

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    const form = {
      contenu: text.trim(),
      recipientId: selectedConversation,
      file,
      metadata: replyingTo ? { replyToId: replyingTo.id, replyToContent: replyingTo.contenu || (replyingTo.metadata?.fileName ? "📎 Fichier joint" : "Message") } : {},
    };
    const { error } = await sendMessage(form);
    if (!error) {
      setText("");
      setFile(null);
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const updated = await loadConversations();
      setConversations(updated);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDownload = async (attachment) => {
    try {
      if (attachment.filePath) {
        const { error } = await telechargerChatAttachment(attachment.filePath, attachment.fileName);
        if (error) {
          showToast(`Échec du téléchargement : ${error.message}`);
        } else {
          showToast("Téléchargement démarré");
        }
      } else if (attachment.contractId) {
        const { downloadContractDocument } = await import("../lib/contractPdf");
        await downloadContractDocument(
          attachment.contractId,
          "transmitted",
          attachment.fileName || "fichier.pdf"
        );
        showToast("Téléchargement démarré");
      }
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      showToast(`Échec du téléchargement : ${error.message}`);
    }
  };

  const handleDelete = async (messageId) => {
    await deleteMessage(messageId);
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    textareaRef.current?.focus();
  };

  const getSenderName = useCallback((senderId) => {
    if (senderId === currentUserId) return "Vous";
    return senderId || "Utilisateur";
  }, [currentUserId]);

  const conversationMessages = useMemo(() => {
    return messages.filter((m) => m.recipientId === selectedConversation || m.senderId === selectedConversation);
  }, [messages, selectedConversation]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    conversationMessages.forEach((message) => {
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

  const filteredConversations = useMemo(() => {
    if (userRole !== "prestataire") return conversations;
    const allowedIds = new Set(participants.map((p) => p.id));
    return conversations.filter((c) => allowedIds.has(c.id));
  }, [conversations, participants, userRole]);

  const selectedContact = selectedConversation
    ? participants.find((p) => p.id === selectedConversation) || conversations.find((c) => c.id === selectedConversation)
    : null;

  const chatPartnerName = selectedContact?.name || "Sélectionner un contact";

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, background: T.bg, borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden" }}>
      {/* Sidebar des conversations */}
      <ConversationList
        conversations={filteredConversations}
        participants={participants}
        loading={loadingConversations}
        selectedId={selectedConversation}
        onSelect={setSelectedConversation}
        currentUserId={currentUserId}
        userRole={userRole}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Zone de chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg, minHeight: 0 }}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div style={{
              padding: "14px 20px",
              background: T.paper,
              borderBottom: `1px solid ${T.line}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {chatPartnerName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{chatPartnerName}</div>
                <div style={{ fontSize: 11.5, color: T.teal, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.teal, display: "inline-block" }} />
                  En ligne
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {loading ? (
                <div style={{ textAlign: "center", color: T.inkSoft, padding: 60 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Chargement des messages...</div>
                </div>
              ) : conversationMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: T.inkSoft, padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Démarrez la conversation</div>
                  <div style={{ fontSize: 13, maxWidth: 280, margin: "0 auto", lineHeight: 1.5 }}>
                    Envoyez un message à {chatPartnerName}
                  </div>
                </div>
              ) : (
                <>
                  {groupedMessages.map((group) => (
                    <div key={group.date} style={{ marginBottom: 28 }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 20,
                      }}>
                        <div style={{ flex: 1, height: 1, background: T.line }} />
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.inkSoft,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          background: T.bg,
                          padding: "4px 12px",
                          borderRadius: 12,
                          border: `1px solid ${T.line}`,
                        }}>
                          {group.date}
                        </span>
                        <div style={{ flex: 1, height: 1, background: T.line }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Réponse en cours */}
            {replyingTo && (
              <div style={{
                padding: "12px 16px",
                borderTop: `1px solid ${T.line}`,
                background: T.paper,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: T.goldSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Reply size={16} style={{ color: T.gold }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                    En réponse à {getSenderName(replyingTo.senderId)}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: T.inkSoft,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: 2,
                  }}>
                    {replyingTo.contenu || (replyingTo.metadata?.fileName ? "📎 Fichier joint" : "Message")}
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: T.inkSoft,
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Fichier sélectionné */}
            {file && (
              <div style={{
                padding: "10px 16px",
                borderTop: `1px solid ${T.line}`,
                background: T.paper,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <Paperclip size={16} style={{ color: T.inkSoft, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.name}
                </span>
                <span style={{ fontSize: 11, color: T.inkSoft, flexShrink: 0 }}>
                  {(file.size / 1024).toFixed(1)} Ko
                </span>
                <button
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: T.brick,
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Barre de saisie */}
            <div style={{
              padding: "12px 16px",
              background: T.paper,
              borderTop: `1px solid ${T.line}`,
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}>
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
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: T.inkSoft,
                  flexShrink: 0,
                }}
                title="Joindre un fichier"
              >
                <Paperclip size={20} />
              </button>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={replyingTo ? `Répondre à ${getSenderName(replyingTo.senderId)}...` : "Écrivez votre message..."}
                  rows={1}
                  style={{
                    width: "100%",
                    resize: "none",
                    border: `1px solid ${T.line}`,
                    borderRadius: 24,
                    padding: "10px 44px 10px 16px",
                    fontSize: 14,
                    lineHeight: 1.5,
                    background: T.bg,
                    color: T.ink,
                    outline: "none",
                    fontFamily: "inherit",
                    minHeight: 40,
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
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: T.inkSoft,
                    padding: 0,
                  }}
                  title="Emojis"
                >
                  <Smile size={18} />
                </button>
                {showEmojiPicker && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 44,
                      right: 0,
                      display: "flex",
                      gap: 6,
                      padding: 10,
                      borderRadius: 16,
                      border: `1px solid ${T.line}`,
                      background: T.paper,
                      boxShadow: `0 4px 20px ${alpha(T.sidebar, 20)}`,
                      zIndex: 20,
                    }}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setText((t) => t + emoji);
                          setShowEmojiPicker(false);
                          textareaRef.current?.focus();
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 20,
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
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "none",
                  background: (!text.trim() && !file) ? T.line : `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                  color: (!text.trim() && !file) ? T.inkSoft : "#fff",
                  cursor: (!text.trim() && !file) ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
                title="Envoyer"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: T.inkSoft,
            padding: 60,
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
              Sélectionnez une conversation
            </div>
            <div style={{ fontSize: 14, maxWidth: 300, textAlign: "center", lineHeight: 1.5 }}>
              Choisissez un contact dans la liste pour commencer à discuter
            </div>
          </div>
        )}
      </div>
      <Toast message={toast} />
    </div>
  );
}