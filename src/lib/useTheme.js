import { useSyncExternalStore, useCallback, useEffect, useRef } from "react";

const KEY = "facturo:theme";

const DAY_START = 7;  // 07:00
const NIGHT_START = 19; // 19:00

const isDayHours = () => {
  if (typeof window === "undefined") return true;
  const h = new Date().getHours();
  return h >= DAY_START && h < NIGHT_START;
};

export const resolveTheme = (pref) => {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return isDayHours() ? "light" : "dark";
};

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" || v === "auto" ? v : "auto";
  } catch {
    return "auto";
  }
}

function apply(pref) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(pref);
}

const listeners = new Set();
let pref = readStored();
apply(pref);

const notify = () => listeners.forEach((cb) => cb());
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const getSnapshot = () => pref;
const getServerSnapshot = () => "auto";

function setTheme(next) {
  const clean = next === "dark" || next === "light" || next === "auto" ? next : "auto";
  pref = clean;
  try { localStorage.setItem(KEY, clean); } catch {}
  apply(clean);
  notify();
}

let dayTimer = null;
function scheduleDayNightCheck() {
  if (dayTimer) clearTimeout(dayTimer);
  if (typeof window === "undefined") return;
  const now = new Date();
  const h = now.getHours();
  const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
  dayTimer = setTimeout(() => {
    if (pref === "auto") { apply("auto"); notify(); }
    scheduleDayNightCheck();
  }, Math.max(msUntilNextHour, 60_000));
}

if (typeof window !== "undefined") {
  scheduleDayNightCheck();
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (pref === "auto") { apply("auto"); notify(); }
    });
  }
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolved = resolveTheme(pref);

  const toggle = useCallback(
    () => {
      if (pref === "auto") {
        setTheme(resolveTheme("auto") === "dark" ? "light" : "dark");
      } else if (pref === "light") {
        setTheme("dark");
      } else {
        setTheme("auto");
      }
    },
    [pref]
  );

  return {
    pref,
    resolved,
    isDark: resolved === "dark",
    setTheme,
    toggle,
  };
}
