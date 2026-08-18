import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

let audioCtx = null;

export function jouerSonNotification() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch (_) {
    // Son indisponible : on n'interrompt jamais l'application pour ça.
  }
}

function notificationNavigateur(titre, message) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(titre, { body: message });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(titre, { body: message });
      });
    }
  } catch (_) {
    // Notifications navigateur non disponibles
  }
}

export function useNotifications(userId, entrepriseId) {
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const load = useCallback(async () => {
    if (!userId) { setChargement(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("destinataire_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
    setChargement(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifs-" + userId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "destinataire_user_id=eq." + userId,
        },
        ({ new: notif }) => {
          setNotifications((prev) => [notif, ...prev].slice(0, 30));
          jouerSonNotification();
          notificationNavigateur(notif.titre, notif.message);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const marquerLues = async (ids) => {
    if (!ids || ids.length === 0) return;
    await supabase.from("notifications").update({ lu: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, lu: true } : n)));
  };

  const toutMarquerLues = () => marquerLues(notifications.filter((n) => !n.lu).map((n) => n.id));

  const nonLues = notifications.filter((n) => !n.lu).length;

  return { notifications, nonLues, chargement, marquerLues, toutMarquerLues, reload: load };
}
