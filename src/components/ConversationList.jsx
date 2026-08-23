import React, { useState, useEffect, useMemo } from "react";
import { Search, Users, User, Building2, Briefcase, CheckCircle2 } from "lucide-react";
import { T } from "../lib/theme";

const ROLE_ICONS = {
  administrateur: Building2,
  comptable: Briefcase,
  commercial: Users,
  employe: User,
  super_admin: CheckCircle2,
  prestataire: User,
};

const ROLE_LABELS = {
  administrateur: "Admin",
  comptable: "Comptable",
  commercial: "Commercial",
  employe: "Employé",
  super_admin: "Super Admin",
  prestataire: "Prestataire",
};

export function ConversationList({
  conversations,
  participants,
  loading,
  selectedId,
  onSelect,
  currentUserId,
  userRole,
  searchQuery,
  onSearchChange,
}) {
  const [activeTab, setActiveTab] = useState("conversations");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase();
    return participants.filter((p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q));
  }, [participants, searchQuery]);

  return (
    <div style={{
      width: 320,
      minWidth: 280,
      background: T.paper,
      borderRight: `1px solid ${T.line}`,
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 16px 12px",
        borderBottom: `1px solid ${T.line}`,
        background: T.paper,
      }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: T.ink,
          margin: "0 0 16px 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <Users size={22} style={{ color: T.gold }} />
          Messages
        </h2>

        {/* Search */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 10,
          background: T.bg,
          border: `1px solid ${T.line}`,
          marginBottom: 12,
        }}>
          <Search size={16} style={{ color: T.inkSoft, flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher..."
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 13.5,
              color: T.ink,
              outline: "none",
              padding: "2px 0",
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 6,
          background: T.bg,
          padding: 4,
          borderRadius: 10,
        }}>
          <button
            onClick={() => setActiveTab("conversations")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: activeTab === "conversations" ? T.paper : "transparent",
              color: activeTab === "conversations" ? T.ink : T.inkSoft,
              fontWeight: activeTab === "conversations" ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: activeTab === "conversations" ? `0 1px 3px ${alpha(T.sidebar, 8)}` : "none",
              transition: "all 0.2s",
            }}
          >
            Conversations
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: activeTab === "contacts" ? T.paper : "transparent",
              color: activeTab === "contacts" ? T.ink : T.inkSoft,
              fontWeight: activeTab === "contacts" ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: activeTab === "contacts" ? `0 1px 3px ${alpha(T.sidebar, 8)}` : "none",
              transition: "all 0.2s",
            }}
          >
            Contacts
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 0",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: T.inkSoft }}>Chargement...</div>
        ) : activeTab === "conversations" ? (
          filteredConversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: T.inkSoft }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 13 }}>Aucune conversation</div>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: selectedId === conv.id ? T.goldSoft : "transparent",
                  borderLeft: selectedId === conv.id ? `3px solid ${T.gold}` : "3px solid transparent",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== conv.id) {
                    e.currentTarget.style.background = T.bg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== conv.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {conv.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.ink,
                    marginBottom: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {conv.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: T.inkSoft,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {conv.lastMessage || "Aucun message"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontSize: 10.5,
                    color: T.inkSoft,
                    marginBottom: 2,
                  }}>
                    {conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : ""}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: T.gold,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "0 5px",
                    }}>
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          filteredParticipants.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: T.inkSoft }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 13 }}>Aucun contact</div>
            </div>
          ) : (
            filteredParticipants.map((participant) => {
              const Icon = ROLE_ICONS[participant.role] || User;
              return (
                <div
                  key={participant.id}
                  onClick={() => onSelect(participant.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: selectedId === participant.id ? T.goldSoft : "transparent",
                    borderLeft: selectedId === participant.id ? `3px solid ${T.gold}` : "3px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== participant.id) {
                      e.currentTarget.style.background = T.bg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== participant.id) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${T.teal}, ${alpha(T.teal, 75)})`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: T.ink,
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {participant.name}
                    </div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: T.inkSoft,
                      background: T.bg,
                      padding: "2px 8px",
                      borderRadius: 6,
                    }}>
                      <Icon size={10} />
                      {ROLE_LABELS[participant.role] || participant.role}
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

function alpha(color, opacity) {
  if (typeof color !== "string" || !color.startsWith("var(--t-")) {
    return color;
  }
  const token = color.replace("var(--t-", "").replace(")", "");
  const fallback = {
    sidebar: "rgba(22,33,58,0.08)",
    paper: "rgba(255,255,255,0.08)",
    invert: "rgba(0,0,0,0.08)",
  };
  return fallback[token] || `rgba(0,0,0,${opacity})`;
}