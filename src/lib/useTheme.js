import { useSyncExternalStore, useCallback } from "react";

const KEY = "facturo:theme";

const systemTheme = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const resolveTheme = (pref) =>
  pref === "dark" ? "dark" : pref === "light" ? "light" : systemTheme();

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

// Store partagé : toutes les instances de useTheme restent synchronisées.
const listeners = new Set();
let pref = readStored();
apply(pref);

const notify = () => listeners.forEach((cb) => cb());
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const getSnapshot = () => pref;
const getServerSnapshot = () => "auto";

function setTheme(next) {
  const clean = next === "dark" || next === "light" ? next : "auto";
  pref = clean;
  try { localStorage.setItem(KEY, clean); } catch {}
  apply(clean);
  notify();
}

if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (pref === "auto") { apply("auto"); notify(); }
  });
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolved = resolveTheme(pref);

  const toggle = useCallback(
    () => setTheme(resolveTheme(pref) === "dark" ? "light" : "dark"),
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
