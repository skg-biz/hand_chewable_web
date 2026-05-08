import Matter from "matter-js";

export interface SquishyKind {
  id: string;
  name: string;
  emoji: string;
  fill: string;
  highlight: string;
  stiffness: number;
  damping: number;
  burstThreshold: number;
}

export const KINDS: SquishyKind[] = [
  { id: "peach", name: "복숭아", emoji: "🍑", fill: "#FFB99A", highlight: "#FFD9C0", stiffness: 0.04, damping: 0.18, burstThreshold: 70 },
  { id: "bread", name: "빵", emoji: "🥐", fill: "#FFE38F", highlight: "#FFF1C4", stiffness: 0.06, damping: 0.2, burstThreshold: 80 },
  { id: "slime", name: "슬라임", emoji: "🟢", fill: "#A8E8C0", highlight: "#D5F4E0", stiffness: 0.018, damping: 0.08, burstThreshold: 110 },
  { id: "jelly", name: "고양이젤리", emoji: "🐾", fill: "#FFC9D6", highlight: "#FFE3EC", stiffness: 0.025, damping: 0.1, burstThreshold: 90 },
  { id: "tofu", name: "두부", emoji: "🧊", fill: "#FFF8EC", highlight: "#FFFFFF", stiffness: 0.08, damping: 0.25, burstThreshold: 50 },
  { id: "mochi", name: "모찌", emoji: "🍡", fill: "#E0D4F7", highlight: "#F2EAFC", stiffness: 0.03, damping: 0.15, burstThreshold: 95 },
  { id: "pudding", name: "푸딩", emoji: "🍮", fill: "#D9A06B", highlight: "#F2C896", stiffness: 0.022, damping: 0.12, burstThreshold: 85 },
];

export interface SoftBody {
  composite: Matter.Composite;
  particles: Matter.Body[];
  center: Matter.Body;
  kind: SquishyKind;
  origin: { x: number; y: number; r: number };
}

export function createSoftBody(world: Matter.World, kind: SquishyKind, cx: number, cy: number, r: number): SoftBody {
  const composite = Matter.Composite.create();
  const particles: Matter.Body[] = [];
  const ringCount = 14;
  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2;
    const b = Matter.Bodies.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.18, {
      density: 0.001,
      frictionAir: kind.damping,
      restitution: 0.5,
      collisionFilter: { group: Matter.Body.nextGroup(true) },
    });
    particles.push(b);
    Matter.Composite.add(composite, b);
  }
  const center = Matter.Bodies.circle(cx, cy, r * 0.25, {
    density: 0.002,
    frictionAir: kind.damping,
    collisionFilter: { group: particles[0].collisionFilter.group },
  });
  Matter.Composite.add(composite, center);

  // Ring constraints
  for (let i = 0; i < ringCount; i++) {
    const a = particles[i];
    const b = particles[(i + 1) % ringCount];
    Matter.Composite.add(
      composite,
      Matter.Constraint.create({
        bodyA: a, bodyB: b,
        stiffness: kind.stiffness,
        damping: 0.08,
        length: Matter.Vector.magnitude(Matter.Vector.sub(a.position, b.position)),
      })
    );
    Matter.Composite.add(
      composite,
      Matter.Constraint.create({
        bodyA: a, bodyB: center,
        stiffness: kind.stiffness * 0.6,
        damping: 0.08,
        length: r,
      })
    );
    // Cross brace to neighbor+2 (helps avoid kinks)
    const c = particles[(i + 2) % ringCount];
    Matter.Composite.add(
      composite,
      Matter.Constraint.create({
        bodyA: a, bodyB: c,
        stiffness: kind.stiffness * 0.4,
        damping: 0.06,
        length: Matter.Vector.magnitude(Matter.Vector.sub(a.position, c.position)),
      })
    );
  }
  Matter.World.add(world, composite);
  return { composite, particles, center, kind, origin: { x: cx, y: cy, r } };
}

export function destroySoftBody(world: Matter.World, body: SoftBody) {
  Matter.World.remove(world, body.composite);
}

export function maxStretch(body: SoftBody): number {
  let max = 0;
  for (const p of body.particles) {
    const d = Matter.Vector.magnitude(Matter.Vector.sub(p.position, body.center.position));
    if (d > max) max = d;
  }
  return max;
}

export function reformAt(body: SoftBody, cx: number, cy: number) {
  const r = body.origin.r;
  const ringCount = body.particles.length;
  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2;
    Matter.Body.setPosition(body.particles[i], { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    Matter.Body.setVelocity(body.particles[i], { x: 0, y: 0 });
  }
  Matter.Body.setPosition(body.center, { x: cx, y: cy });
  Matter.Body.setVelocity(body.center, { x: 0, y: 0 });
}
