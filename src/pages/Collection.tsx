import { useApp } from "../shared/store";

const ALL_ACHIEVEMENTS = [
  { id: "first-pop", emoji: "🫧", name: "첫 거품", desc: "뽁뽁 1칸 터트리기" },
  { id: "pop-100", emoji: "💥", name: "백 발 백중", desc: "뽁뽁 100칸 누적" },
  { id: "pop-1000", emoji: "🔥", name: "버블 마스터", desc: "뽁뽁 1,000칸 누적" },
  { id: "pop-streak-30", emoji: "🌈", name: "콤보 30", desc: "타임어택에서 30콤보" },
  { id: "first-spin", emoji: "🌀", name: "첫 회전", desc: "스피너 한 번 돌리기" },
  { id: "spin-rpm-1k", emoji: "💨", name: "RPM 1만", desc: "한 번에 RPM 1,000+" },
  { id: "spin-long", emoji: "⏳", name: "장수 회전", desc: "30초 이상 한 번에 회전" },
  { id: "first-squish", emoji: "🍑", name: "첫 변형", desc: "말랑이 한 번 누르기" },
  { id: "squish-pop", emoji: "💢", name: "터졌다", desc: "말랑이 임계점 폭발" },
  { id: "squish-all", emoji: "🌟", name: "스퀴시 컬렉터", desc: "모든 종류 만져보기" },
  { id: "first-wakppu", emoji: "🎵", name: "첫 누름", desc: "왁뿌 1번 누르기" },
  { id: "simon-10", emoji: "🧠", name: "기억력 천재", desc: "사이먼 10단계" },
  { id: "pixel-art", emoji: "🎨", name: "픽셀 아티스트", desc: "픽셀 아트 저장" },
  { id: "first-keycap", emoji: "⌨️", name: "첫 키캡", desc: "키캡을 한 번 눌러보기" },
  { id: "keycap-saved", emoji: "💾", name: "내 빌드", desc: "디자인을 저장" },
  { id: "keycap-row", emoji: "🎹", name: "키캡 컬렉터", desc: "한 줄에 5개 이상 배치" },
  { id: "grand-slam", emoji: "🏆", name: "그랜드 슬램", desc: "오늘 5게임 모두 플레이" },
  { id: "konami", emoji: "🎮", name: "이스터에그", desc: "??? 코드를 입력하세요" },
];

export default function Collection() {
  const { achievements, stats } = useApp();
  const owned = new Set(achievements.map((a) => a.id));
  return (
    <div className="page">
      <h1 style={{ fontSize: "2rem" }}>🏆 도감</h1>
      <p style={{ color: "var(--charcoal-soft)" }}>업적을 모아보세요. ({owned.size} / {ALL_ACHIEVEMENTS.length})</p>
      <div className="stat-row" style={{ marginTop: "1rem" }}>
        <span className="stat">뽁뽁 <strong>{stats.popTotal.toLocaleString()}</strong></span>
        <span className="stat">스피너 RPM <strong>{stats.spinRpmTotal.toLocaleString()}</strong></span>
        <span className="stat">말랑이 <strong>{stats.squishyDeforms.toLocaleString()}</strong></span>
        <span className="stat">왁뿌 <strong>{stats.wakppuPresses.toLocaleString()}</strong></span>
      </div>
      <div className="home-grid" style={{ marginTop: "1.5rem" }}>
        {ALL_ACHIEVEMENTS.map((a) => {
          const got = owned.has(a.id);
          return (
            <div key={a.id} className="home-card" style={{ opacity: got ? 1 : 0.5 }}>
              <div className="emoji">{got ? a.emoji : "🔒"}</div>
              <h2>{a.name}</h2>
              <p>{a.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
