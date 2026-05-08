import { useApp, type SoundPack, type Theme } from "../shared/store";

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "🌞 라이트" },
  { value: "dark", label: "🌙 다크" },
  { value: "neon", label: "✨ 네온" },
];
const packs: { value: SoundPack; label: string }[] = [
  { value: "classic", label: "🎼 클래식" },
  { value: "real", label: "🎤 리얼" },
  { value: "cartoon", label: "📺 카툰" },
  { value: "fart", label: "💨 방귀" },
];

export default function Settings() {
  const {
    theme, setTheme, soundOn, toggleSound, soundPack, setSoundPack,
    reducedMotion, setReducedMotion, lowSpec, setLowSpec, nickname, setNickname,
  } = useApp();
  return (
    <div className="page">
      <h1 style={{ fontSize: "2rem" }}>⚙️ 설정</h1>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>닉네임</h2>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={12}
          style={{
            padding: "0.6rem 1rem", borderRadius: "var(--radius-pill)", border: "none",
            background: "var(--white)", boxShadow: "var(--shadow-sm)", fontFamily: "inherit", fontSize: "1rem",
          }}
        />
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>테마</h2>
        <div className="toolbar">
          {themes.map((t) => (
            <button key={t.value} className="chip" data-active={theme === t.value} onClick={() => setTheme(t.value)}>{t.label}</button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>사운드</h2>
        <div className="toolbar">
          <button className="chip" data-active={soundOn} onClick={toggleSound}>{soundOn ? "🔊 켜짐" : "🔇 꺼짐"}</button>
          {packs.map((p) => (
            <button key={p.value} className="chip" data-active={soundPack === p.value} onClick={() => setSoundPack(p.value)}>{p.label}</button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>접근성/성능</h2>
        <div className="toolbar">
          <button className="chip" data-active={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>모션 줄이기</button>
          <button className="chip" data-active={lowSpec} onClick={() => setLowSpec(!lowSpec)}>저사양 모드</button>
        </div>
      </section>
    </div>
  );
}
