import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { useApp } from "./shared/store";
import { unlockAudioContext } from "./shared/audio/sounds";
import Home from "./pages/Home";
import Daily from "./pages/Daily";
import Collection from "./pages/Collection";
import Settings from "./pages/Settings";
import PopPage from "./games/pop/PopPage";
import SpinnerPage from "./games/spinner/SpinnerPage";
import SquishyPage from "./games/squishy/SquishyPage";
import WakppuPage from "./games/wakppu/WakppuPage";
import KeycapPage from "./games/keycap/KeycapPage";
import EmbedPage from "./pages/Embed";
import { useEasterEggs, checkGrandSlam } from "./shared/easter";

function ThemeSync() {
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "" : theme;
  }, [theme]);
  return null;
}

function VisitTracker() {
  const noteVisit = useApp((s) => s.noteVisit);
  useEasterEggs();
  useEffect(() => {
    noteVisit();
    const onPointer = () => unlockAudioContext();
    window.addEventListener("pointerdown", onPointer, { once: true });
    const id = setInterval(checkGrandSlam, 5000);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      clearInterval(id);
    };
  }, [noteVisit]);
  return null;
}

function Header() {
  const { soundOn, toggleSound, theme, setTheme } = useApp();
  const cycleTheme = () => setTheme(theme === "light" ? "dark" : theme === "dark" ? "neon" : "light");
  return (
    <header className="app-header">
      <h1>
        <Link to="/">
          <span className="bounce-emoji" aria-hidden>🫧</span> 손씹는웹
        </Link>
      </h1>
      <nav className="header-actions">
        <Link to="/daily" className="icon-btn" aria-label="데일리 미션">🎯</Link>
        <Link to="/collection" className="icon-btn" aria-label="도감">🏆</Link>
        <button className="icon-btn" onClick={cycleTheme} aria-label="테마 전환">
          {theme === "light" ? "🌞" : theme === "dark" ? "🌙" : "✨"}
        </button>
        <button className="icon-btn" onClick={toggleSound} aria-label="사운드 토글">
          {soundOn ? "🔊" : "🔇"}
        </button>
        <Link to="/settings" className="icon-btn" aria-label="설정">⚙️</Link>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <div className="app">
      <ThemeSync />
      <VisitTracker />
      <Routes>
        <Route path="/embed/:game" element={<EmbedPage />} />
        <Route
          path="*"
          element={
            <>
              <Header />
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/pop" element={<PopPage />} />
                  <Route path="/spinner" element={<SpinnerPage />} />
                  <Route path="/squishy" element={<SquishyPage />} />
                  <Route path="/wakppu" element={<WakppuPage />} />
                  <Route path="/keycap" element={<KeycapPage />} />
                  <Route path="/daily" element={<Daily />} />
                  <Route path="/collection" element={<Collection />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </>
          }
        />
      </Routes>
    </div>
  );
}
