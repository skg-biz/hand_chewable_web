import { supabase } from "./client";

export interface LeaderEntry {
  game: string;
  mode: string;
  score: number;
  nickname: string;
  played_on?: string;
}

const LOCAL_KEY = "hcw-local-leaderboard";

function readLocal(): LeaderEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(entries: LeaderEntry[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, 200)));
}

export async function submitScore(entry: LeaderEntry) {
  const local = readLocal();
  local.push({ ...entry, played_on: new Date().toISOString().slice(0, 10) });
  writeLocal(local);
  if (!supabase) return;
  try {
    await supabase.from("daily_leaderboard").insert(entry);
  } catch {
    /* swallow */
  }
}

export async function getTopScores(game: string, mode: string, limit = 10): Promise<LeaderEntry[]> {
  if (supabase) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("daily_leaderboard")
        .select("*")
        .eq("game", game)
        .eq("mode", mode)
        .eq("played_on", today)
        .order("score", { ascending: false })
        .limit(limit);
      if (data?.length) return data as LeaderEntry[];
    } catch {
      /* swallow */
    }
  }
  return readLocal()
    .filter((e) => e.game === game && e.mode === mode)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
