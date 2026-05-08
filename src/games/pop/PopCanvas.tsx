import { useEffect, useRef } from "react";
import type { PopGridState, Shape } from "./PopGrid";
import { popCell } from "./PopGrid";
import { usePointer } from "../../shared/input/usePointer";
import { useKey } from "../../shared/input/useKey";
import { playPop } from "../../shared/audio/sounds";
import { haptic } from "../../shared/input/useHaptic";
import { useApp } from "../../shared/store";

interface Props {
  grid: PopGridState;
  highlightIndex?: number;
  cursorIdx?: number;
  setCursorIdx?: (i: number) => void;
  onPop?: (col: number, row: number, info: { trap: boolean; reward: boolean; chain: number }) => void;
  themeColor?: string;
}

const SHAPE_DRAWERS: Record<Shape, (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void> = {
  round: (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); },
  heart: (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.4);
    ctx.bezierCurveTo(x, y, x - r, y, x - r, y - r * 0.3);
    ctx.bezierCurveTo(x - r, y - r, x, y - r, x, y - r * 0.3);
    ctx.bezierCurveTo(x, y - r, x + r, y - r, x + r, y - r * 0.3);
    ctx.bezierCurveTo(x + r, y, x, y, x, y + r * 0.4);
    ctx.fill();
  },
  star: (ctx, x, y, r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  },
  sausage: (ctx, x, y, r) => {
    const w = r * 1.6, h = r * 0.9;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x - w, y - h, w * 2, h * 2, h);
    } else {
      ctx.rect(x - w, y - h, w * 2, h * 2);
    }
    ctx.fill();
  },
};

export default function PopCanvas({ grid, highlightIndex = -1, cursorIdx, setCursorIdx, onPop, themeColor = "#FFB99A" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const lowSpec = useApp((s) => s.lowSpec);

  const handlePop = (col: number, row: number) => {
    const info = popCell(grid, col, row, performance.now());
    if (info.popped) {
      playPop({ detune: (col + row * 31) % 200 - 100 });
      haptic(info.trap ? [10, 20, 25] : 12);
      onPop?.(col, row, { trap: info.trap, reward: info.reward, chain: info.chain });
    }
  };

  usePointer(canvasRef, {
    onDown: (e) => {
      const cell = pointerToCell(e.x, e.y);
      if (cell) handlePop(cell.col, cell.row);
    },
    onMove: (e) => {
      if (!e.pressure || e.pressure < 0.05) return;
      const cell = pointerToCell(e.x, e.y);
      if (cell) handlePop(cell.col, cell.row);
    },
  });

  useKey({
    ArrowLeft: () => setCursorIdx?.(Math.max(0, (cursorIdx ?? 0) - 1)),
    ArrowRight: () => setCursorIdx?.(Math.min(grid.cells.length - 1, (cursorIdx ?? 0) + 1)),
    ArrowUp: () => setCursorIdx?.(Math.max(0, (cursorIdx ?? 0) - grid.cols)),
    ArrowDown: () => setCursorIdx?.(Math.min(grid.cells.length - 1, (cursorIdx ?? 0) + grid.cols)),
    Enter: () => { if (cursorIdx != null) { const c = cursorIdx % grid.cols; const r = Math.floor(cursorIdx / grid.cols); handlePop(c, r); } },
    " ":     () => { if (cursorIdx != null) { const c = cursorIdx % grid.cols; const r = Math.floor(cursorIdx / grid.cols); handlePop(c, r); } },
  });

  function pointerToCell(x: number, y: number): { col: number; row: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const cellW = w / grid.cols;
    const cellH = h / grid.rows;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return null;
    return { col, row };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = ref.current;
    if (!canvas || !wrap) return;
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

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      const cellW = w / grid.cols;
      const cellH = h / grid.rows;
      const radius = Math.min(cellW, cellH) * 0.36;
      const t = performance.now();
      const drawer = SHAPE_DRAWERS[grid.shape];

      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const idx = r * grid.cols + c;
          const cell = grid.cells[idx];
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;
          const isHighlight = idx === highlightIndex;
          const isCursor = idx === cursorIdx;

          if (cell.popped) {
            ctx.fillStyle = "rgba(0,0,0,0.05)";
            drawer(ctx, cx, cy, radius * 0.55);
            const since = t - cell.flashAt;
            if (since < 280 && !reducedMotion) {
              const k = 1 - since / 280;
              ctx.fillStyle = `rgba(255,255,255,${k * 0.7})`;
              drawer(ctx, cx, cy, radius * (0.6 + k * 0.7));
            }
            continue;
          }

          const baseHue = (idx * 13) % 360;
          const fill = isHighlight
            ? `hsl(${baseHue}, 100%, 70%)`
            : cell.trap
              ? "#FF8FB1"
              : cell.reward
                ? "#FFE38F"
                : themeColor;

          ctx.shadowColor = "rgba(58,58,58,0.18)";
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;
          ctx.fillStyle = fill;
          drawer(ctx, cx, cy, radius);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          ctx.fillStyle = "rgba(255,255,255,0.55)";
          drawer(ctx, cx - radius * 0.25, cy - radius * 0.3, radius * 0.32);

          if (isCursor) {
            ctx.strokeStyle = "#3A3A3A";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [grid, highlightIndex, cursorIdx, themeColor, reducedMotion, lowSpec]);

  return (
    <div ref={ref} className="canvas-wrap" style={{ aspectRatio: `${grid.cols} / ${grid.rows}` }}>
      <canvas ref={canvasRef} aria-label="에어캡 뽁뽁 그리드" tabIndex={0} />
    </div>
  );
}
