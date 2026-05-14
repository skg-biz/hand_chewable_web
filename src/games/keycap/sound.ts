import type { SoundType } from "./types";
import { useApp } from "../../shared/store";

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Layered impulse: short noise burst + tone, shaped per switch flavor.
export function playKeycapSound(type: SoundType, opts: { variation?: number } = {}) {
  if (!useApp.getState().soundOn) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const detune = (opts.variation ?? Math.random() * 60 - 30);

  const presets: Record<SoundType, { noiseFreq: number; noiseGain: number; noiseRelease: number; toneFreq: number; toneGain: number; toneRelease: number; type: OscillatorType }> = {
    click:  { noiseFreq: 3500, noiseGain: 0.32, noiseRelease: 0.045, toneFreq: 2200, toneGain: 0.10, toneRelease: 0.04, type: "square" },
    thock:  { noiseFreq: 380,  noiseGain: 0.30, noiseRelease: 0.07,  toneFreq: 180,  toneGain: 0.22, toneRelease: 0.10, type: "sine" },
    clack:  { noiseFreq: 2600, noiseGain: 0.28, noiseRelease: 0.05,  toneFreq: 1200, toneGain: 0.12, toneRelease: 0.05, type: "triangle" },
    creamy: { noiseFreq: 600,  noiseGain: 0.18, noiseRelease: 0.08,  toneFreq: 320,  toneGain: 0.20, toneRelease: 0.09, type: "sine" },
  };
  const p = presets[type];

  // Noise burst (attack)
  const noiseBuf = c.createBuffer(1, Math.ceil(c.sampleRate * p.noiseRelease), c.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.Q.value = 1.2;
  noiseFilter.frequency.value = p.noiseFreq;
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(p.noiseGain, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + p.noiseRelease);
  noise.connect(noiseFilter).connect(noiseGain).connect(c.destination);
  noise.start(t);

  // Body tone
  const osc = c.createOscillator();
  osc.type = p.type;
  osc.frequency.setValueAtTime(p.toneFreq, t);
  osc.detune.value = detune;
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, p.toneFreq * 0.55), t + p.toneRelease);
  const oGain = c.createGain();
  oGain.gain.setValueAtTime(0, t);
  oGain.gain.linearRampToValueAtTime(p.toneGain, t + 0.003);
  oGain.gain.exponentialRampToValueAtTime(0.0001, t + p.toneRelease);
  osc.connect(oGain).connect(c.destination);
  osc.start(t);
  osc.stop(t + p.toneRelease + 0.05);
}
