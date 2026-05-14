import { useEffect, useMemo, useRef, useState } from "react";
import PopCanvas from "./PopCanvas";
import { createGrid, pickToFlash, poppedCount, reset, type Shape } from "./PopGrid";
import { useApp } from "../../shared/store";
import { bumpCounter } from "../../shared/supabase/counter";
import { submitScore } from "../../shared/supabase/leaderboard";
import { buildShareCard, shareOrDownload } from "../../components/ShareCard";

type Mode = "free" | "timeattack" | "rhythm";

const SHAPES: { value: Shape; label: string }[] = [
  { value: "round", label: "🟠 원형" },
  { value: "heart", label: "💗 하트" },
  { value: "star", label: "⭐ 별" },
  { value: "sausage", label: "🌭 소시지" },
];

interface Props { embed?: boolean }

export default function PopPage({ embed }: Props) {
  const [mode, setMode] = useState<Mode>("free");
  const [shape, setShape] = useState<Shape>("round");
  const [cols, setCols] = useState(12);
  const [rows, setRows] = useState(16);
  const [grid, setGrid] = useState(() => createGrid(cols, rows, shape));
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [cursorIdx, setCursorIdx] = useState<number | undefined>(undefined);
  const [bpm, setBpm] = useState(110);
  const lastPopAt = useRef(0);
  const { bumpStat, unlock, nickname } = useApp();
  const scoreRef = useRef(score);
  const nicknameRef = useRef(nickname);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { nicknameRef.current = nickname; }, [nickname]);

  useEffect(() => {
    setGrid(createGrid(cols, rows, shape));
    setScore(0);
    setCombo(0);
    setHighlight(-1);
  }, [cols, rows, shape]);

  // Timer — score/nickname excluded from deps intentionally; refs keep fresh values
  useEffect(() => {
    if (mode !== "timeattack" || !running) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          void submitScore({ game: "pop", mode: "timeattack", score: scoreRef.current, nickname: nicknameRef.current });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, running]);

  // Rhythm beat
  useEffect(() => {
    if (mode !== "rhythm") { setHighlight(-1); return; }
    const interval = (60 / bpm) * 1000;
    const id = setInterval(() => {
      setHighlight(pickToFlash(grid));
    }, interval);
    return () => clearInterval(id);
  }, [mode, bpm, grid]);

  const handlePop = (_c: number, _r: number, info: { trap: boolean; reward: boolean; chain: number }) => {
    bumpStat("popTotal", info.chain);
    bumpCounter("pop_total", info.chain);
    unlock("first-pop");
    if (poppedCount(grid) >= 100) unlock("pop-100");
    if (poppedCount(grid) >= 1000) unlock("pop-1000");
    const now = performance.now();
    const isCombo = now - lastPopAt.current < 800;
    lastPopAt.current = now;
    setCombo((c) => {
      const next = isCombo ? c + 1 : 1;
      setBestCombo((b) => Math.max(b, next));
      if (next >= 30) unlock("pop-streak-30");
      return next;
    });
    if (mode === "timeattack") {
      setScore((s) => s + info.chain * (1 + Math.floor(combo / 5)) + (info.reward ? 5 : 0));
    } else {
      setScore((s) => s + info.chain + (info.reward ? 5 : 0));
    }
  };

  const startTimeAttack = () => {
    setGrid(createGrid(cols, rows, shape));
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(60);
    setRunning(true);
  };

  const totalPopped = useMemo(() => poppedCount(grid), [grid, score]);
  const themeColorResolved = mode === "rhythm" ? "#B89BE8" : mode === "timeattack" ? "#FFB99A" : "#FFD9C0";

  return (
    <div className="game-page">
      {!embed && (
        <>
          <div className="toolbar">
            <button className="chip" data-active={mode === "free"} onClick={() => { setMode("free"); setRunning(false); }}>♾️ 자유</button>
            <button className="chip" data-active={mode === "timeattack"} onClick={() => setMode("timeattack")}>⏱️ 타임어택</button>
            <button className="chip" data-active={mode === "rhythm"} onClick={() => setMode("rhythm")}>🎵 리듬</button>
          </div>
          <div className="toolbar">
            {SHAPES.map((s) => (
              <button key={s.value} className="chip" data-active={shape === s.value} onClick={() => setShape(s.value)}>{s.label}</button>
            ))}
            <button className="chip" onClick={() => { reset(grid); setGrid({ ...grid }); setScore(0); setCombo(0); }}>🔄 리셋</button>
            <button className="chip" onClick={() => { setCols(cols < 20 ? cols + 2 : 6); setRows(rows < 24 ? rows + 2 : 8); }}>📏 크기 {cols}×{rows}</button>
          </div>
          {mode === "rhythm" && (
            <div className="toolbar">
              <button className="chip" onClick={() => setBpm(Math.max(60, bpm - 10))}>−</button>
              <span className="chip" data-active>🎶 {bpm} BPM</span>
              <button className="chip" onClick={() => setBpm(Math.min(180, bpm + 10))}>+</button>
            </div>
          )}
          {mode === "timeattack" && !running && (
            <div className="toolbar">
              <button className="chip" data-active onClick={startTimeAttack}>▶ 60초 시작</button>
              {score > 0 && (
                <button className="chip" onClick={async () => {
                  const blob = await buildShareCard({
                    title: "에어캡 뽁뽁 타임어택",
                    emoji: "🫧",
                    scoreLabel: "내 점수",
                    scoreValue: score.toLocaleString(),
                    subtitle: `최고 콤보 ${bestCombo}`,
                    themeColor: "#FFB99A",
                  });
                  if (blob) await shareOrDownload(blob, "popop-score.png");
                }}>📤 공유 카드</button>
              )}
            </div>
          )}
          <div className="stat-row">
            <span className="stat">점수 <strong>{score}</strong></span>
            <span className="stat">콤보 <strong>{combo}</strong> (최고 {bestCombo})</span>
            <span className="stat">터트림 <strong>{totalPopped}</strong> / {grid.cells.length}</span>
            {mode === "timeattack" && <span className="stat">⏱ <strong>{timeLeft}s</strong></span>}
          </div>
        </>
      )}
      <PopCanvas
        grid={grid}
        highlightIndex={highlight}
        cursorIdx={cursorIdx}
        setCursorIdx={setCursorIdx}
        onPop={handlePop}
        themeColor={themeColorResolved}
      />
      {!embed && <p style={{ color: "var(--charcoal-soft)", fontSize: "0.85rem" }}>마우스 드래그로 쓸기 · 키보드 ←↑→↓ + Space · 폰 진동 ON</p>}
    </div>
  );
}
