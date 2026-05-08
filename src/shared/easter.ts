import { useEffect } from "react";
import { useApp } from "./store";

const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

export function useEasterEggs() {
  const { unlock, setTheme } = useApp();
  useEffect(() => {
    let buf: string[] = [];
    const handler = (e: KeyboardEvent) => {
      buf.push(e.key);
      if (buf.length > KONAMI.length) buf = buf.slice(-KONAMI.length);
      if (buf.length === KONAMI.length && buf.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
        unlock("konami");
        setTheme("neon");
        buf = [];
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [unlock, setTheme]);
}

export function checkGrandSlam() {
  const { stats, achievements, unlock } = useApp.getState();
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastVisit !== today) return;
  const allFour =
    stats.popTotal > 0 &&
    stats.spinRpmTotal > 0 &&
    stats.squishyDeforms > 0 &&
    stats.wakppuPresses > 0;
  if (allFour && !achievements.some((a) => a.id === "grand-slam")) {
    unlock("grand-slam");
  }
}
