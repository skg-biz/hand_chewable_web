import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useApp } from "../shared/store";
import { getGlobalCounter } from "../shared/supabase/counter";

const games = [
  { to: "/pop", emoji: "🫧", title: "에어캡 뽁뽁", desc: "끝없는 시트, 리듬 모드, 함정 칸까지", color: "var(--sky)" },
  { to: "/spinner", emoji: "🌀", title: "피젯스피너", desc: "플릭으로 돌리고 자이로로 가속", color: "var(--lavender)" },
  { to: "/squishy", emoji: "🍑", title: "말랑이", desc: "누르고 늘이고 자르고 합성", color: "var(--peach)" },
  { to: "/wakppu", emoji: "🎵", title: "팝잇", desc: "누름패드/사이먼/픽셀아트/사운드패드", color: "var(--mint)" },
  { to: "/keycap", emoji: "⌨️", title: "키캡 디자이너", desc: "Cherry/SA/MT3 프로파일, 프리셋 20종, 1u~3u", color: "var(--rose)" },
];

export default function Home() {
  const { stats } = useApp();
  const [globalPops, setGlobalPops] = useState<number | null>(null);

  useEffect(() => {
    void getGlobalCounter("pop_total").then(setGlobalPops);
  }, []);

  return (
    <div className="page">
      <section className="hero">
        <h1>손이 심심할 때, 잠깐 들렀다 가세요</h1>
        <p>피젯스피너 · 말랑이 · 뽁뽁 · 팝잇 — 마우스, 키보드, 손가락 다 환영</p>
        <div className="global-counter" aria-live="polite">
          🌍 오늘까지 전세계 누적 뽁뽁{" "}
          <strong>{globalPops != null ? globalPops.toLocaleString() : "···"}</strong> 칸
        </div>
        {stats.streakDays > 1 && (
          <div className="global-counter">
            🔥 연속 출석 <strong>{stats.streakDays}</strong>일
          </div>
        )}
      </section>
      <div className="home-grid">
        {games.map((g) => (
          <Link key={g.to} to={g.to} className="home-card" style={{ borderTop: `8px solid ${g.color}` }}>
            <div className="emoji" aria-hidden>{g.emoji}</div>
            <h2>{g.title}</h2>
            <p>{g.desc}</p>
          </Link>
        ))}
      </div>
      <section className="hero" style={{ marginTop: "3rem" }}>
        <p style={{ fontSize: "0.85rem" }}>
          전 게임 회원가입 없이 바로 플레이 · 오프라인 지원 · 키보드만으로 OK
        </p>
      </section>
    </div>
  );
}
