import { useApp } from "../shared/store";

interface Mission {
  id: string;
  emoji: string;
  title: string;
  target: number;
  current: number;
  game: string;
}

function todaySeed(): number {
  const t = new Date();
  return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
}

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function Daily() {
  const { stats } = useApp();
  const r = rand(todaySeed());
  const popTarget = 100 + Math.floor(r() * 200); // r() 한 번만 호출해 title과 target 동일 보장
  const missions: Mission[] = [
    { id: "pop", emoji: "🫧", title: `뽁뽁 ${popTarget}칸`, target: popTarget, current: stats.popTotal, game: "/pop" },
    { id: "spin", emoji: "🌀", title: `누적 RPM 5,000`, target: 5000, current: stats.spinRpmTotal, game: "/spinner" },
    { id: "squishy", emoji: "🍑", title: `말랑이 30회 변형`, target: 30, current: stats.squishyDeforms, game: "/squishy" },
    { id: "wakppu", emoji: "🎵", title: `팝잇 50회 누르기`, target: 50, current: stats.wakppuPresses, game: "/wakppu" },
  ];
  return (
    <div className="page">
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎯 오늘의 미션</h1>
      <p style={{ color: "var(--charcoal-soft)" }}>매일 자정에 갱신돼요. 다 깨면 그랜드 슬램!</p>
      <div className="home-grid" style={{ marginTop: "1.5rem" }}>
        {missions.map((m) => {
          const pct = Math.min(100, Math.round((m.current / m.target) * 100));
          const done = pct >= 100;
          return (
            <div key={m.id} className="home-card" style={{ opacity: done ? 0.7 : 1 }}>
              <div className="emoji">{done ? "✅" : m.emoji}</div>
              <h2>{m.title}</h2>
              <p>{m.current.toLocaleString()} / {m.target.toLocaleString()}</p>
              <div style={{ height: 8, background: "var(--cream)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: done ? "var(--mint-deep)" : "var(--lavender-deep)", transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
