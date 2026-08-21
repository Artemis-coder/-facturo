import { useState, useEffect } from "react";

export const MOBILE_BP = 880;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}
