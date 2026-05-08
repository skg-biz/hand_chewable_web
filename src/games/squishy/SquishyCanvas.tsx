import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { createSoftBody, destroySoftBody, maxStretch, reformAt, type SoftBody, type SquishyKind } from "./softBody";
import { useApp } from "../../shared/store";
import { playPop, playClick } from "../../shared/audio/sounds";
import { haptic } from "../../shared/input/useHaptic";

interface Props {
  kind: SquishyKind;
  onDeform: () => void;
  onBurst: () => void;
}

export default function SquishyCanvas({ kind, onDeform, onBurst }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lowSpec = useApp((s) => s.lowSpec);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const dpr = lowSpec ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const engine = Matter.Engine.create();
    engine.gravity.y = 0.6;
    const world = engine.world;

    let body: SoftBody;
    let walls: Matter.Body[] = [];
    let raf = 0;
    let burstAt = 0;

    const buildWalls = () => {
      walls.forEach((w) => Matter.World.remove(world, w));
      const w = wrap.clientWidth, h = wrap.clientHeight;
      const t = 60;
      walls = [
        Matter.Bodies.rectangle(w / 2, h + t / 2, w * 2, t, { isStatic: true }),
        Matter.Bodies.rectangle(w / 2, -t / 2, w * 2, t, { isStatic: true }),
        Matter.Bodies.rectangle(-t / 2, h / 2, t, h * 2, { isStatic: true }),
        Matter.Bodies.rectangle(w + t / 2, h / 2, t, h * 2, { isStatic: true }),
      ];
      Matter.World.add(world, walls);
    };

    const resetBody = () => {
      if (body) destroySoftBody(world, body);
      const w = wrap.clientWidth, h = wrap.clientHeight;
      const r = Math.min(w, h) * 0.18;
      body = createSoftBody(world, kind, w / 2, h / 2, r);
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      buildWalls();
    };
    resize();
    resetBody();
    const ro = new ResizeObserver(() => { resize(); resetBody(); });
    ro.observe(wrap);

    const grabbing = new Map<number, { body: Matter.Body; constraint: Matter.Constraint }>();

    const findClosest = (x: number, y: number): Matter.Body | null => {
      let best: Matter.Body | null = null;
      let dmin = Infinity;
      for (const p of body.particles) {
        const d = Math.hypot(p.position.x - x, p.position.y - y);
        if (d < dmin && d < 80) { dmin = d; best = p; }
      }
      if (!best) {
        const dc = Math.hypot(body.center.position.x - x, body.center.position.y - y);
        if (dc < 80) best = body.center;
      }
      return best;
    };

    const toCanvasXY = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * canvas.clientWidth, y: ((e.clientY - rect.top) / rect.height) * canvas.clientHeight };
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      const { x, y } = toCanvasXY(e);
      const target = findClosest(x, y);
      if (!target) return;
      const c = Matter.Constraint.create({ pointA: { x, y }, bodyB: target, pointB: { x: 0, y: 0 }, stiffness: 0.3, damping: 0.1 });
      Matter.World.add(world, c);
      grabbing.set(e.pointerId, { body: target, constraint: c });
      onDeform();
      playClick();
      haptic(8);
    };
    const onPMove = (e: PointerEvent) => {
      const grab = grabbing.get(e.pointerId);
      if (!grab) return;
      const { x, y } = toCanvasXY(e);
      grab.constraint.pointA = { x, y };
    };
    const onUp = (e: PointerEvent) => {
      const grab = grabbing.get(e.pointerId);
      if (grab) {
        Matter.World.remove(world, grab.constraint);
        grabbing.delete(e.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onPMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onUp);

    let lastT = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(33, now - lastT);
      lastT = now;
      Matter.Engine.update(engine, dt);

      // Burst check
      const stretch = maxStretch(body);
      const limit = body.origin.r + body.kind.burstThreshold;
      if (stretch > limit && now - burstAt > 800) {
        burstAt = now;
        playPop({ detune: -200 });
        haptic([20, 40, 20]);
        onBurst();
        // release all grabs
        for (const [id, g] of grabbing) { Matter.World.remove(world, g.constraint); grabbing.delete(id); }
        // explode outward, then reform
        for (const p of body.particles) {
          Matter.Body.setVelocity(p, {
            x: (p.position.x - body.center.position.x) * 0.2,
            y: (p.position.y - body.center.position.y) * 0.2,
          });
        }
        setTimeout(() => reformAt(body, wrap.clientWidth / 2, wrap.clientHeight / 2), 600);
      }

      // Render
      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(tick); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      const pts = body.particles;
      const n = pts.length;
      ctx.moveTo(pts[0].position.x, pts[0].position.y);
      for (let i = 0; i < n; i++) {
        const cur = pts[i];
        const nxt = pts[(i + 1) % n];
        const mx = (cur.position.x + nxt.position.x) / 2;
        const my = (cur.position.y + nxt.position.y) / 2;
        ctx.quadraticCurveTo(cur.position.x, cur.position.y, mx, my);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(
        body.center.position.x - body.origin.r * 0.3,
        body.center.position.y - body.origin.r * 0.3,
        body.origin.r * 0.1,
        body.center.position.x,
        body.center.position.y,
        body.origin.r * 1.5,
      );
      grad.addColorStop(0, body.kind.highlight);
      grad.addColorStop(1, body.kind.fill);
      ctx.fillStyle = grad;
      ctx.shadowColor = "rgba(58,58,58,0.18)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Highlight specular
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(
        body.center.position.x - body.origin.r * 0.3,
        body.center.position.y - body.origin.r * 0.4,
        body.origin.r * 0.25,
        body.origin.r * 0.15,
        -Math.PI / 6, 0, Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onPMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onUp);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [kind, lowSpec, onDeform, onBurst]);

  return (
    <div ref={wrapRef} className="canvas-wrap" style={{ aspectRatio: "1 / 1", maxWidth: 540 }}>
      <canvas ref={canvasRef} aria-label={`${kind.name} 말랑이`} tabIndex={0} />
    </div>
  );
}

