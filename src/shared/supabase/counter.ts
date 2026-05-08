import { supabase } from "./client";

export type Metric = "pop_total" | "spin_rpm_total" | "squishy_deforms" | "wakppu_presses";

const FALLBACK_KEY = "hcw-global-counters";

interface Counters {
  [m: string]: number;
}

function readLocal(): Counters {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeLocal(c: Counters) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(c));
}

const buffer: Counters = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function bumpCounter(metric: Metric, by = 1) {
  buffer[metric] = (buffer[metric] ?? 0) + by;
  const local = readLocal();
  local[metric] = (local[metric] ?? 0) + by;
  writeLocal(local);
  if (!flushTimer) {
    flushTimer = setTimeout(flushCounters, 1500);
  }
}

async function flushCounters() {
  flushTimer = null;
  if (!supabase) return;
  const entries = Object.entries(buffer);
  if (!entries.length) return;
  const payload = entries.map(([metric, value]) => ({ metric, value }));
  Object.keys(buffer).forEach((k) => delete buffer[k]);
  try {
    await supabase.rpc("increment_counters", { items: payload });
  } catch {
    /* offline / not configured */
  }
}

export async function getGlobalCounter(metric: Metric): Promise<number> {
  const local = readLocal()[metric] ?? 0;
  if (!supabase) return local;
  try {
    const { data } = await supabase
      .from("global_counter")
      .select("value")
      .eq("metric", metric)
      .single();
    return Math.max(local, (data?.value as number) ?? 0);
  } catch {
    return local;
  }
}
