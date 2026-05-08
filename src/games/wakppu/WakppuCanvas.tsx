import { useEffect, useRef } from "react";
import type { WakppuState } from "./grid";
import { useApp } from "../../shared/store";

interface Props {
  state: WakppuState;
  highlight?: number;
  cellColor: (idx: number) => string;
  onPress: (idx: number) => void;
  onHover?: (idx: number) => void;
}

export default function WakppuCanvas({ state, highlight = -1, cellColor, onPress, onHover }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lowSpec = useApp((s) => s.lowSpec);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = lowSpec ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const idxAt = (cx: number, cy: number): number => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cellW = w / state.size;
      const cellH = h / state.size;
      const c = Math.floor(cx / cellW);
      const r = Math.floor(cy / cellH);
      if (c < 0 || c >= state.size || r < 0 || r >= state.size) return -1;
      return r * state.size + c;
    };
    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * canvas.clientWidth, y: ((e.clientY - rect.top) / rect.height) * canvas.clientHeight };
    };

    const onDown = (e: PointerEvent) => {
      const { x, y } = toLocal(e);
      const i = idxAt(x, y);
      if (i >= 0) onPress(i);
    };
    const onMove = (e: PointerEvent) => {
      if (!onHover) return;
      const { x, y } = toLocal(e);
      const i = idxAt(x, y);
      if (i >= 0) onHover(i);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      const cellW = w / state.size;
      const cellH = h / state.size;
      const t = performance.now();

      for (let r = 0; r < state.size; r++) {
        for (let c = 0; c < state.size; c++) {
          const idx = r * state.size + c;
          const cell = state.cells[idx];
          const x = c * cellW;
          const y = r * cellH;
          const padding = Math.min(cellW, cellH) * 0.08;
          const radius = Math.min(cellW, cellH) * 0.45;
          const cx = x + cellW / 2;
          const cy = y + cellH / 2;

          // Socket (well)
          ctx.fillStyle = "#E8DCD0";
          ctx.beginPath();
          ctx.arc(cx, cy + 2, radius - padding * 0.5, 0, Math.PI * 2);
          ctx.fill();

          const baseColor = cellColor(idx);
          const isFlashing = t - cell.flashAt < 350;
          const glow = idx === highlight;

          if (cell.raised) {
            // Bubble up
            ctx.shadowColor = "rgba(58,58,58,0.22)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;
            ctx.fillStyle = glow ? "#FFE38F" : baseColor;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.beginPath();
            ctx.arc(cx - radius * 0.25, cy - radius * 0.3, radius * 0.32, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Pressed (concave)
            ctx.fillStyle = isFlashing ? "rgba(255,227,143,0.6)" : "rgba(58,58,58,0.06)";
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [state, highlight, cellColor, onPress, onHover, lowSpec]);

  return (
    <div ref={wrapRef} className="canvas-wrap" style={{ aspectRatio: "1 / 1", maxWidth: 560 }}>
      <canvas ref={canvasRef} aria-label="왁뿌 그리드" tabIndex={0} />
    </div>
  );
}
