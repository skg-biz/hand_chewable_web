import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WakppuCanvas from "./WakppuCanvas";
import { createBoard, keyToIndex, press, type WakppuMode } from "./grid";
import { useApp } from "../../shared/store";
import { bumpCounter } from "../../shared/supabase/counter";
import { playClick, playNote } from "../../shared/audio/sounds";
import { haptic } from "../../shared/input/useHaptic";

interface Props { embed?: boolean }

const PASTEL_PALETTE = ["#FFD9C0","#FFC9D6","#E0D4F7","#C9E4FF","#C9F0E0","#FFE38F","#FFB99A","#B89BE8"];
const PIXEL_PALETTE = ["#FFB99A","#B89BE8","#8DDCC0","#FFC9D6","#FFE38F","#3A3A3A","#FFFFFF","#FF6BD3"];
const SCALE_MAJOR_C = [60,62,64,65,67,69,71,72,74,76]; // MIDI

export default function WakppuPage({ embed }: Props) {
  const [size, setSize] = useState(4);
  const [mode, setMode] = useState<WakppuMode>("free");
  const [state, setState] = useState(() => createBoard(size));
  const [pixelColor, setPixelColor] = useState(PIXEL_PALETTE[0]);
  const [simonSeq, setSimonSeq] = useState<number[]>([]);
  const [simonStep, setSimonStep] = useState(0);
  const [simonHighlight, setSimonHighlight] = useState(-1);
  const [simonStage, setSimonStage] = useState<"watch" | "input" | "lost" | "idle">("idle");
  const { bumpStat, unlock, soundOn } = useApp();
  const colorByIdxRef = useRef<Map<number, string>>(new Map());

  useEffect(() => { setState(createBoard(size)); colorByIdxRef.current = new Map(); }, [size]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = keyToIndex(e.key, size);
      if (idx != null) doPress(idx);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const doPress = useCallback((idx: number) => {
    const wave = mode === "wave";
    press(state, idx, performance.now(), { wave });
    setState({ ...state });
    bumpStat("wakppuPresses", 1);
    bumpCounter("wakppu_presses", 1);
    unlock("first-wakppu");
    haptic(8);
    if (mode === "soundpad") {
      const note = SCALE_MAJOR_C[idx % SCALE_MAJOR_C.length];
      playNote(note, 0.5, "triangle");
    } else {
      playClick();
    }
    if (mode === "pixel") {
      colorByIdxRef.current.set(idx, pixelColor);
    }
    if (mode === "simon" && simonStage === "input") {
      const expected = simonSeq[simonStep];
      if (idx === expected) {
        const next = simonStep + 1;
        if (next === simonSeq.length) {
          if (simonSeq.length >= 10) unlock("simon-10");
          setTimeout(() => extendSimon(), 600);
          setSimonStep(0);
        } else {
          setSimonStep(next);
        }
      } else {
        setSimonStage("lost");
      }
    }
  }, [mode, state, bumpStat, unlock, pixelColor, simonStage, simonSeq, simonStep]);

  const extendSimon = useCallback(() => {
    const next = [...simonSeq, Math.floor(Math.random() * size * size)];
    setSimonSeq(next);
    setSimonStage("watch");
    setSimonStep(0);
    let i = 0;
    const tick = () => {
      if (i >= next.length) {
        setSimonHighlight(-1);
        setSimonStage("input");
        return;
      }
      setSimonHighlight(next[i]);
      playNote(SCALE_MAJOR_C[next[i] % SCALE_MAJOR_C.length], 0.4, "sine");
      i++;
      setTimeout(() => { setSimonHighlight(-1); setTimeout(tick, 200); }, 450);
    };
    setTimeout(tick, 600);
  }, [simonSeq, size]);

  const startSimon = () => {
    setSimonSeq([]);
    setSimonStage("idle");
    setTimeout(() => extendSimon(), 200);
  };

  const cellColor = useCallback((idx: number) => {
    if (mode === "pixel") {
      return colorByIdxRef.current.get(idx) ?? PASTEL_PALETTE[(idx * 3) % PASTEL_PALETTE.length];
    }
    if (mode === "soundpad") {
      const hue = ((idx * 360) / (size * size)) | 0;
      return `hsl(${hue}, 70%, 80%)`;
    }
    return PASTEL_PALETTE[(idx * 7) % PASTEL_PALETTE.length];
  }, [mode, size]);

  const exportPixelPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size * 32;
    canvas.height = size * 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    for (let i = 0; i < state.cells.length; i++) {
      const c = i % size;
      const r = Math.floor(i / size);
      ctx.fillStyle = colorByIdxRef.current.get(i) ?? "#FFF8EC";
      ctx.fillRect(c * 32, r * 32, 32, 32);
    }
    canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wakppu-pixel.png";
      a.click();
      URL.revokeObjectURL(url);
      unlock("pixel-art");
    });
  };

  const stat = useMemo(() => {
    const raised = state.cells.filter((c) => c.raised).length;
    return { raised, pressed: state.cells.length - raised };
  }, [state]);

  return (
    <div className="game-page">
      {!embed && (
        <>
          <div className="toolbar">
            <button className="chip" data-active={mode === "free"} onClick={() => setMode("free")}>👆 자유</button>
            <button className="chip" data-active={mode === "wave"} onClick={() => setMode("wave")}>🌊 웨이브</button>
            <button className="chip" data-active={mode === "simon"} onClick={() => setMode("simon")}>🧠 사이먼</button>
            <button className="chip" data-active={mode === "soundpad"} onClick={() => setMode("soundpad")} disabled={!soundOn}>🎵 사운드패드</button>
            <button className="chip" data-active={mode === "pixel"} onClick={() => setMode("pixel")}>🎨 픽셀</button>
          </div>
          <div className="toolbar">
            {[3,4,5,6,8].map((n) => (
              <button key={n} className="chip" data-active={size === n} onClick={() => setSize(n)}>{n}×{n}</button>
            ))}
            <button className="chip" onClick={() => setState(createBoard(size))}>🔄 리셋</button>
          </div>
          {mode === "pixel" && (
            <div className="toolbar">
              {PIXEL_PALETTE.map((c) => (
                <button key={c} className="chip" data-active={pixelColor === c} style={{ background: c, color: c === "#3A3A3A" ? "#FFF" : "#3A3A3A" }} onClick={() => setPixelColor(c)} aria-label={`색 ${c}`}>●</button>
              ))}
              <button className="chip" data-active onClick={exportPixelPNG}>💾 PNG 저장</button>
            </div>
          )}
          {mode === "simon" && (
            <div className="toolbar">
              <button className="chip" data-active onClick={startSimon}>▶ 시작</button>
              <span className="chip">단계 {simonSeq.length}</span>
              <span className="chip">{simonStage === "watch" ? "👀 보기" : simonStage === "input" ? "⌨️ 따라하기" : simonStage === "lost" ? "❌ 실패" : "대기"}</span>
            </div>
          )}
          <div className="stat-row">
            <span className="stat">눌림 <strong>{stat.pressed}</strong></span>
            <span className="stat">올라옴 <strong>{stat.raised}</strong></span>
          </div>
        </>
      )}
      <WakppuCanvas state={state} highlight={simonHighlight} cellColor={cellColor} onPress={doPress} />
      {!embed && <p style={{ color: "var(--charcoal-soft)", fontSize: "0.85rem" }}>키보드: 1234/QWER/ASDF/ZXCV (4×4) · 사이먼 모드는 패턴을 따라하세요</p>}
    </div>
  );
}
