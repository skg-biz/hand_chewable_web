import { useApp } from "../store";

let ctx: AudioContext | null = null;
function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export type ToneSpec = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  detune?: number;
  noise?: boolean;
};

export function playTone(spec: ToneSpec) {
  if (!useApp.getState().soundOn) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const gain = ac.createGain();
  const peak = spec.gain ?? 0.18;
  const attack = spec.attack ?? 0.005;
  const release = spec.release ?? Math.max(0.05, spec.duration);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  gain.connect(ac.destination);

  if (spec.noise) {
    const buf = ac.createBuffer(1, ac.sampleRate * release, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = spec.freq;
    src.connect(filter).connect(gain);
    src.start(t);
    src.stop(t + release + 0.05);
  } else {
    const osc = ac.createOscillator();
    osc.type = spec.type ?? "sine";
    osc.frequency.setValueAtTime(spec.freq, t);
    osc.detune.value = spec.detune ?? 0;
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, spec.freq * 0.5), t + release);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + release + 0.05);
  }
}

const PACKS = {
  classic: { pop: { freq: 880, duration: 0.12, type: "triangle" as OscillatorType }, click: { freq: 540, duration: 0.06, type: "sine" as OscillatorType } },
  real:    { pop: { freq: 720, duration: 0.18, noise: true }, click: { freq: 320, duration: 0.08, noise: true } },
  cartoon: { pop: { freq: 1200, duration: 0.18, type: "square" as OscillatorType }, click: { freq: 880, duration: 0.06, type: "square" as OscillatorType } },
  fart:    { pop: { freq: 90, duration: 0.32, type: "sawtooth" as OscillatorType, gain: 0.25 }, click: { freq: 60, duration: 0.18, type: "sawtooth" as OscillatorType } },
} as const;

export function playPop(opts: { detune?: number } = {}) {
  const pack = useApp.getState().soundPack;
  const spec = { ...PACKS[pack].pop, detune: opts.detune ?? (Math.random() * 200 - 100) };
  playTone(spec);
}

export function playClick() {
  const pack = useApp.getState().soundPack;
  playTone(PACKS[pack].click);
}

export function playNote(midi: number, duration = 0.4, type: OscillatorType = "sine") {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  playTone({ freq, duration, type, attack: 0.01, release: duration, gain: 0.22 });
}

export function unlockAudioContext() {
  ensureCtx();
}
