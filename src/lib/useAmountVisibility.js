import { useState } from "react";
import { setAmountsHidden } from "./theme";

const KEY = "facturo:hideAmounts";

export function useAmountVisibility() {
  const [hidden, setHidden] = useState(() => {
    const saved = localStorage.getItem(KEY) === "true";
    setAmountsHidden(saved);
    return saved;
  });
  const toggle = () => {
    const next = !hidden;
    setAmountsHidden(next); // sync, avant le re-render
    localStorage.setItem(KEY, String(next));
    setHidden(next);
  };
  return { hidden, toggle };
}
