import { useEffect, useRef } from "react";
import { applyTorque, rpm, step, type SpinnerState } from "./physics";
import { usePointer } from "../../shared/input/usePointer";
import { useApp } from "../../shared/store";


interface Props {
  state: SpinnerState;
  onRpm: (rpm: number) => void;
}

export default function SpinnerCanvas({ state, onRpm }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lowSpec = useApp((s) => s.lowSpec);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const onRpmRef = useRef(onRpm);
  useEffect(() => { onRpmRef.current = onRpm; });

  usePointer(canvasRef, {
    onMove: (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const dx = e.x - cx;
      const dy = e.y - cy;
      // Tangential component of velocity
      const r = Math.hypot(dx, dy) || 1;
      const tx = -dy / r;
      const ty = dx / r;
      const tangential = (e.vx * tx + e.vy * ty) / 1000; // px-per-ms vector → rough angular impulse
      if (Math.abs(tangential) > 0.05 && r > 20) {
        applyTorque(state, tangential * 0.6);
      }
    },
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const dpr = lowSpec ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let lastT = performance.now();

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

    // Keyboard: Space to boost
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { applyTorque(state, 8); e.preventDefault(); }
      if (e.key === "ArrowLeft") applyTorque(state, -3);
      if (e.key === "ArrowRight") applyTorque(state, 3);
    };
    window.addEventListener("keydown", onKey);

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      step(state, dt);
      onRpmRef.current(rpm(state));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const radius = Math.min(w, h) * 0.42;
      const speed = Math.min(1, Math.abs(state.angularVelocity) / 80);

      // Glow halo when fast
      if (speed > 0.05 && !reducedMotion) {
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.4);
        grad.addColorStop(0, `hsla(${(now / 5) % 360}, 80%, 70%, ${speed * 0.4})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Persistence-of-vision blurred copies
      const blades = state.blades;
      const ghostCount = reducedMotion ? 1 : Math.max(1, Math.round(speed * 6));
      for (let g = ghostCount - 1; g >= 0; g--) {
        const ang = state.angle - g * 0.05 * Math.sign(state.angularVelocity || 1);
        ctx.globalAlpha = (g === 0 ? 1 : 0.2);
        drawSpinner(ctx, cx, cy, radius, ang, blades, state.ledColor, state.trailColor);
      }
      ctx.globalAlpha = 1;

      // Center bearing
      ctx.fillStyle = "#3A3A3A";
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  // onRpm excluded from deps — stable via onRpmRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, lowSpec, reducedMotion]);

  return (
    <div ref={wrapRef} className="canvas-wrap" style={{ aspectRatio: "1 / 1", maxWidth: 540 }}>
      <canvas ref={canvasRef} aria-label="피젯 스피너" tabIndex={0} />
    </div>
  );
}

function drawSpinner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  blades: SpinnerState["blades"],
  led: string,
  trail: string,
) {
  const armLen = radius * 0.85;
  const lobeR = radius * 0.32;
  if (blades === 1) {
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = led;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * radius * 0.6, cy + Math.sin(angle) * radius * 0.6, lobeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 0; i < blades; i++) {
    const a = angle + (i * Math.PI * 2) / blades;
    const lx = cx + Math.cos(a) * armLen;
    const ly = cy + Math.sin(a) * armLen;
    // Arm
    ctx.strokeStyle = trail;
    ctx.lineWidth = lobeR * 0.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    // Lobe
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.arc(lx, ly, lobeR, 0, Math.PI * 2);
    ctx.fill();
    // LED
    ctx.fillStyle = led;
    ctx.beginPath();
    ctx.arc(lx, ly, lobeR * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}
