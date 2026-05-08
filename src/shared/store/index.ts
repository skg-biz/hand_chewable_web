import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "neon";
export type SoundPack = "classic" | "real" | "cartoon" | "fart";

export interface Stats {
  popTotal: number;
  spinRpmTotal: number;
  squishyDeforms: number;
  wakppuPresses: number;
  playSeconds: number;
  streakDays: number;
  lastVisit: string | null;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}

interface AppState {
  theme: Theme;
  soundOn: boolean;
  soundPack: SoundPack;
  reducedMotion: boolean;
  lowSpec: boolean;
  nickname: string;
  stats: Stats;
  achievements: Achievement[];

  setTheme: (t: Theme) => void;
  toggleSound: () => void;
  setSoundPack: (p: SoundPack) => void;
  setReducedMotion: (v: boolean) => void;
  setLowSpec: (v: boolean) => void;
  setNickname: (n: string) => void;
  bumpStat: (key: keyof Stats, by?: number) => void;
  unlock: (id: string) => void;
  noteVisit: () => void;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      soundOn: true,
      soundPack: "classic",
      reducedMotion: false,
      lowSpec: false,
      nickname: "익명버블",
      stats: {
        popTotal: 0,
        spinRpmTotal: 0,
        squishyDeforms: 0,
        wakppuPresses: 0,
        playSeconds: 0,
        streakDays: 0,
        lastVisit: null,
      },
      achievements: [],
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.dataset.theme = theme === "light" ? "" : theme;
      },
      toggleSound: () => set({ soundOn: !get().soundOn }),
      setSoundPack: (soundPack) => set({ soundPack }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setLowSpec: (lowSpec) => set({ lowSpec }),
      setNickname: (nickname) => set({ nickname: nickname.slice(0, 12) || "익명버블" }),
      bumpStat: (key, by = 1) => {
        const stats = { ...get().stats };
        if (typeof stats[key] === "number") {
          (stats[key] as number) += by;
          set({ stats });
        }
      },
      unlock: (id) => {
        if (get().achievements.some((a) => a.id === id)) return;
        set({ achievements: [...get().achievements, { id, unlockedAt: new Date().toISOString() }] });
      },
      noteVisit: () => {
        const today = todayKey();
        const last = get().stats.lastVisit;
        if (last === today) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streakDays = last === yesterday ? get().stats.streakDays + 1 : 1;
        set({ stats: { ...get().stats, lastVisit: today, streakDays } });
      },
    }),
    { name: "hand-chewable-web" }
  )
);
