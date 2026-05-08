import { useEffect, useState } from "react";
import SquishyCanvas from "./SquishyCanvas";
import { KINDS } from "./softBody";
import { useApp } from "../../shared/store";
import { bumpCounter } from "../../shared/supabase/counter";

interface Props { embed?: boolean }

const TOUCHED_KEY = "hcw-squishy-touched";

function loadTouched(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const arr = JSON.parse(localStorage.getItem(TOUCHED_KEY) ?? "[]");
    return new Set(arr);
  } catch { return new Set(); }
}
function saveTouched(s: Set<string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TOUCHED_KEY, JSON.stringify([...s]));
}

export default function SquishyPage({ embed }: Props) {
  const [kindIdx, setKindIdx] = useState(0);
  const [touched, setTouched] = useState<Set<string>>(() => loadTouched());
  const { bumpStat, unlock } = useApp();
  const kind = KINDS[kindIdx];

  useEffect(() => {
    if (!touched.has(kind.id)) {
      const next = new Set(touched);
      next.add(kind.id);
      setTouched(next);
      saveTouched(next);
      if (next.size >= KINDS.length) unlock("squish-all");
    }
  }, [kind.id, touched, unlock]);

  const onDeform = () => {
    bumpStat("squishyDeforms", 1);
    bumpCounter("squishy_deforms", 1);
    unlock("first-squish");
  };
  const onBurst = () => unlock("squish-pop");

  return (
    <div className="game-page">
      {!embed && (
        <>
          <div className="toolbar">
            {KINDS.map((k, i) => (
              <button key={k.id} className="chip" data-active={kindIdx === i} onClick={() => setKindIdx(i)}>
                {k.emoji} {k.name}
              </button>
            ))}
          </div>
          <div className="stat-row">
            <span className="stat">컬렉션 <strong>{touched.size}</strong> / {KINDS.length}</span>
            <span className="stat">변형 누적 <strong>{useApp.getState().stats.squishyDeforms.toLocaleString()}</strong></span>
          </div>
        </>
      )}
      <SquishyCanvas key={kind.id} kind={kind} onDeform={onDeform} onBurst={onBurst} />
      {!embed && <p style={{ color: "var(--charcoal-soft)", fontSize: "0.85rem" }}>드래그로 늘이기 · 양손 멀티터치 · 너무 늘이면 *팡!*</p>}
    </div>
  );
}
