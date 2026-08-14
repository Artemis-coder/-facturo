import { useState, useEffect } from "react";

const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

/**
 * useInstallPrompt
 * ----------------
 * Chrome/Edge/Android expose a native "beforeinstallprompt" event we can
 * capture and trigger later from our own button (nicer than relying on the
 * person finding the browser's install icon). iOS Safari never fires this
 * event — there, we surface simple manual instructions instead.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isInStandaloneMode());

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return {
    canInstall: Boolean(deferredPrompt) && !installed,
    isIosSafariManual: isIos() && !installed && !deferredPrompt,
    installed,
    promptInstall,
  };
}
