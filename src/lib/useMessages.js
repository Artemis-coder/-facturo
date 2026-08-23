import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const MESSAGES_SELECT = `
  id, entreprise_id, sender_id, recipient_id, prestataire_id, contract_id, projet_id,
  contenu, type, metadata, lu, lu_at, created_at
`;

const REACTIONS_SELECT = "id, message_id, user_id, emoji, created_at";

const mapMessage = (row) => ({
  id: row.id,
  entrepriseId: row.entreprise_id,
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  prestataireId: row.prestataire_id,
  contractId: row.contract_id,
  projetId: row.projet_id,
  contenu: row.contenu,
  type: row.type,
  metadata: row.metadata || {},
  lu: row.lu,
  luAt: row.lu_at,
  createdAt: row.created_at,
});

const mapReaction = (row) => ({
  id: row.id,
  messageId: row.message_id,
  userId: row.user_id,
  emoji: row.emoji,
  createdAt: row.created_at,
});

export function useMessages(entrepriseId, userId, userRole) {
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadMessages = useCallback(async (filters = {}) => {
    if (!entrepriseId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("messages")
        .select(MESSAGES_SELECT)
        .eq("entreprise_id", entrepriseId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters.prestataireId) {
        query = query.eq("prestataire_id", filters.prestataireId);
      }
      if (filters.contractId) {
        query = query.eq("contract_id", filters.contractId);
      }
      if (filters.projetId) {
        query = query.eq("projet_id", filters.projetId);
      }
      if (filters.recipientId) {
        // Conversation bidirectionnelle : moi -> contact ET contact -> moi.
        query = query.or(
          `and(sender_id.eq.${userId},recipient_id.eq.${filters.recipientId}),and(sender_id.eq.${filters.recipientId},recipient_id.eq.${userId})`
        );
      }

      const { data: messagesData, error: messagesError } = await query;

      if (!messagesError && messagesData) {
        // Stockés en ordre chronologique (les plus récents en bas du fil).
        setMessages(messagesData.slice().reverse().map(mapMessage));
        const unread = messagesData.filter((m) => !m.lu && m.recipient_id === userId).length;
        setUnreadCount(unread);
      }

      if (messagesData?.length > 0) {
        const messageIds = messagesData.map((m) => m.id);
        const { data: reactionsData } = await supabase
          .from("message_reactions")
          .select(REACTIONS_SELECT)
          .in("message_id", messageIds);

        if (!reactionsData) {
          setReactions([]);
        } else {
          setReactions(reactionsData.map(mapReaction));
        }
      } else {
        setReactions([]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des messages:", error);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId, userId]);

  const sendMessage = useCallback(async (form) => {
    if (!entrepriseId || !userId) return { error: new Error("Session invalide.") };

    if (userRole === "prestataire" && form.recipientId) {
      const ADMIN_ROLES = ["administrateur", "super_admin", "comptable", "commercial"];
      const { data: recipientProfile, error: recipientError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", form.recipientId)
        .single();

      if (recipientError || !recipientProfile || !ADMIN_ROLES.includes(recipientProfile.role)) {
        return { error: new Error("En tant que prestataire, vous ne pouvez envoyer des messages qu'aux administrateurs.") };
      }
    }

    const metadata = {
      ...(form.metadata || {}),
    };

    if (form.file) {
      metadata.fileName = form.file.name;
      metadata.fileSize = form.file.size;
      metadata.mimeType = form.file.type;
    }

    const row = {
      entreprise_id: entrepriseId,
      sender_id: userId,
      recipient_id: form.recipientId,
      prestataire_id: form.prestataireId || null,
      contract_id: form.contractId || null,
      projet_id: form.projetId || null,
      contenu: form.contenu || "",
      type: form.file ? "file" : "text",
      metadata,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(row)
      .select(MESSAGES_SELECT)
      .single();

    if (!error && data) {
      const mapped = mapMessage(data);
      // Ordre chronologique : le nouveau message part en bas du fil.
      setMessages((prev) => [...prev, mapped]);

      if (form.file) {
        const safeName = form.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${entrepriseId}/${data.id}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, form.file, { contentType: form.file.type, upsert: false });

        if (!uploadError) {
          const fullMetadata = { ...metadata, filePath };
          await supabase
            .from("messages")
            .update({ metadata: fullMetadata })
            .eq("id", data.id);
          // Sans le realtime (ou avant son arrivée), on injecte le filePath
          // dans l'état local pour que le bouton Télécharger soit actif.
          setMessages((prev) =>
            prev.map((m) => (m.id === data.id ? { ...m, metadata: fullMetadata } : m))
          );
        }
      }
    }

    return { error, message: data };
  }, [entrepriseId, userId, userRole]);

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!userId) return;

    const existing = reactions.find(
      (r) => r.messageId === messageId && r.userId === userId && r.emoji === emoji
    );

    if (existing) {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existing.id);

      if (!error) {
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      }
      return { error };
    }

    const { data, error } = await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: userId, emoji })
      .select(REACTIONS_SELECT)
      .single();

    if (!error && data) {
      setReactions((prev) => [...prev, mapReaction(data)]);
    }

    return { error };
  }, [userId, reactions]);

  const markAsRead = useCallback(async (messageId) => {
    if (!userId) return;
    const { error } = await supabase
      .from("messages")
      .update({ lu: true, lu_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("recipient_id", userId);

    if (!error) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, lu: true, luAt: new Date().toISOString() } : m)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    return { error };
  }, [userId]);

  useEffect(() => {
    if (!entrepriseId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `entreprise_id=eq.${entrepriseId}`,
        },
        async (payload) => {
          const newMessage = mapMessage(payload.new);
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          });

          if (newMessage.recipientId === userId && newMessage.senderId !== userId) {
            setUnreadCount((prev) => prev + 1);
            showToast(`Nouveau message de ${newMessage.senderId === userId ? "vous" : "un utilisateur"}`);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `entreprise_id=eq.${entrepriseId}`,
        },
        (payload) => {
          const updated = mapMessage(payload.new);
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === updated.id);
            const next = exists
              ? prev.map((m) => (m.id === updated.id ? updated : m))
              : [...prev, updated];
            return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        async (payload) => {
          const newReaction = mapReaction(payload.new);
          setReactions((prev) => {
            const exists = prev.some((r) => r.id === newReaction.id);
            if (exists) return prev;
            return [...prev, newReaction];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entrepriseId, userId, showToast]);

  useEffect(() => {
    if (userId) {
      loadMessages();
    }
  }, [loadMessages, userId]);

  const getMessageReactions = useCallback((messageId) => {
    return reactions.filter((r) => r.messageId === messageId);
  }, [reactions]);

  const deleteMessage = useCallback(async (messageId) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", userId);

    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setReactions((prev) => prev.filter((r) => r.messageId !== messageId));
    }

    return { error };
  }, [userId]);

  const loadConversations = useCallback(async () => {
    if (!entrepriseId || !userId) return [];
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, prestataire_id, contenu, type, created_at, lu")
        .eq("entreprise_id", entrepriseId)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error || !data) return [];

      const conversationMap = new Map();
      const userIds = new Set();

      data.forEach((message) => {
        const otherId = message.sender_id === userId ? message.recipient_id : message.sender_id;
        if (!otherId || otherId === userId) return;

        const key = [userId, otherId].sort().join("-");
        if (conversationMap.has(key)) return;

        const lastMessage = message.contenu || (message.type === "file" ? "📎 Fichier" : "");
        conversationMap.set(key, {
          id: otherId,
          name: `Utilisateur ${otherId.slice(0, 8)}`,
          lastMessage,
          lastMessageTime: message.created_at,
          unreadCount: message.lu ? 0 : 1,
          prestataireId: message.prestataire_id,
        });
        userIds.add(otherId);
      });

      const conversations = Array.from(conversationMap.values()).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nom_complet, email, role")
          .in("id", Array.from(userIds));

        if (profiles?.length) {
          const profileMap = new Map(profiles.map((p) => [p.id, p]));
          conversations.forEach((conv) => {
            const profile = profileMap.get(conv.id);
            if (profile) {
              conv.name = profile.nom_complet || profile.email || conv.name;
              conv.role = profile.role;
            }
          });
        }
      }

      return conversations;
    } catch (error) {
      console.error("Erreur lors du chargement des conversations:", error);
      return [];
    }
  }, [entrepriseId, userId]);

  const loadParticipants = useCallback(async () => {
    if (!entrepriseId) return [];
    try {
      const ADMIN_ROLES = ["administrateur", "super_admin", "comptable", "commercial"];
      let query = supabase
        .from("profiles")
        .select("id, email, nom_complet, role")
        .eq("entreprise_id", entrepriseId)
        .neq("id", userId)
        .order("nom_complet", { ascending: true });

      if (userRole === "prestataire") {
        query = query.in("role", ADMIN_ROLES);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map((profile) => ({
        id: profile.id,
        name: profile.nom_complet || profile.email || `Utilisateur ${profile.id.slice(0, 8)}`,
        role: profile.role || "employe",
        email: profile.email,
      }));
    } catch (error) {
      console.error("Erreur lors du chargement des participants:", error);
      return [];
    }
  }, [entrepriseId, userId, userRole]);

  return {
    messages,
    reactions,
    loading,
    unreadCount,
    toast,
    showToast,
    loadMessages,
    sendMessage,
    toggleReaction,
    markAsRead,
    deleteMessage,
    getMessageReactions,
    loadConversations,
    loadParticipants,
  };
}
