export interface SpinnerState {
  angle: number;        // radians
  angularVelocity: number; // rad/s
  friction: number;     // 0..1 per second
  mass: number;
  blades: 3 | 4 | 6 | 1; // 1 = round
  trailColor: string;
  ledColor: string;
}

export function createSpinner(): SpinnerState {
  return {
    angle: 0,
    angularVelocity: 0,
    friction: 0.4,
    mass: 1,
    blades: 3,
    trailColor: "#FFB99A",
    ledColor: "#B89BE8",
  };
}

export function step(s: SpinnerState, dt: number) {
  s.angle += s.angularVelocity * dt;
  // Exponential damping
  const damp = Math.exp(-s.friction * dt);
  s.angularVelocity *= damp;
  // Snap to zero when very slow (prevents jitter)
  if (Math.abs(s.angularVelocity) < 0.05) s.angularVelocity = 0;
}

export function applyTorque(s: SpinnerState, torque: number) {
  s.angularVelocity += torque / s.mass;
  // Cap absurd values
  const cap = 200;
  if (s.angularVelocity > cap) s.angularVelocity = cap;
  if (s.angularVelocity < -cap) s.angularVelocity = -cap;
}

export function rpm(s: SpinnerState): number {
  return Math.abs(s.angularVelocity) * (60 / (Math.PI * 2));
}
