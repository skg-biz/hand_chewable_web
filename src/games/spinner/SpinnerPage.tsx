import { useEffect, useRef, useState } from "react";
import SpinnerCanvas from "./SpinnerCanvas";
import { applyTorque, createSpinner, type SpinnerState } from "./physics";
import { useApp } from "../../shared/store";
import { bumpCounter } from "../../shared/supabase/counter";
import { useGyro } from "../../shared/input/useGyro";

const TRAIL_COLORS = ["#FFB99A", "#B89BE8", "#8DDCC0", "#FFC9D6", "#C9E4FF"];
const LED_COLORS = ["#3A3A3A", "#FFF8EC", "#FF6BD3", "#6BFFE4"];
const BLADE_OPTIONS: SpinnerState["blades"][] = [3, 4, 6, 1];

interface Props { embed?: boolean }

export default function SpinnerPage({ embed }: Props) {
  const stateRef = useRef<SpinnerState>(createSpinner());
  const [, setTick] = useState(0);
  const force = () => setTick((n) => n + 1);
  const [rpmDisplay, setRpmDisplay] = useState(0);
  const rpmDisplayRef = useRef(0);
  const [maxRpm, setMaxRpm] = useState(0);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const gyro = useGyro(gyroEnabled);
  const { bumpStat, unlock, soundOn } = useApp();
  const lastBumpAt = useRef(0);

  useEffect(() => {
    if (gyroEnabled && gyro.available) {
      const torque = (gyro.gamma / 90) * 1.5;
      if (Math.abs(torque) > 0.05) applyTorque(stateRef.current, torque * 0.05);
    }
  }, [gyro, gyroEnabled]);

  // rpmDisplay를 ref로도 동기화해 RAF 루프가 매 프레임 재시작되지 않도록 함
  useEffect(() => { rpmDisplayRef.current = rpmDisplay; }, [rpmDisplay]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const r = rpmDisplayRef.current; // ref에서 최신 RPM 읽기
      // bump global RPM at most every 500ms
      const now = performance.now();
      if (now - lastBumpAt.current > 500 && r > 60) {
        bumpStat("spinRpmTotal", Math.round(r));
        bumpCounter("spin_rpm_total", Math.round(r));
        lastBumpAt.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // rpmDisplay 제거 — ref로 최신값을 읽으므로 deps 불필요
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bumpStat]);

  const onRpm = (r: number) => {
    setRpmDisplay(r);
    if (r > maxRpm) setMaxRpm(r);
    if (r > 1) unlock("first-spin");
    if (r > 1000) unlock("spin-rpm-1k");
  };

  const setBlades = (b: SpinnerState["blades"]) => { stateRef.current.blades = b; force(); };
  const setTrail = (c: string) => { stateRef.current.trailColor = c; force(); };
  const setLed = (c: string) => { stateRef.current.ledColor = c; force(); };
  const setFriction = (f: number) => { stateRef.current.friction = f; force(); };
  const boost = () => applyTorque(stateRef.current, 12);

  // Mic blow detection
  const [micOn, setMicOn] = useState(false);
  useEffect(() => {
    if (!micOn) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          let lowEnergy = 0;
          for (let i = 0; i < 16; i++) lowEnergy += data[i];
          const avg = lowEnergy / 16;
          if (avg > 90) applyTorque(stateRef.current, (avg - 90) / 50);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch { setMicOn(false); }
    })();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [micOn]);

  return (
    <div className="game-page">
      {!embed && (
        <>
          <div className="toolbar">
            {BLADE_OPTIONS.map((b) => (
              <button key={b} className="chip" data-active={stateRef.current.blades === b} onClick={() => setBlades(b)}>
                {b === 1 ? "⭕ 디스크" : `${b}날`}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <span className="chip" data-active>색</span>
            {TRAIL_COLORS.map((c) => (
              <button key={c} className="chip" style={{ background: c }} aria-label={`암 색 ${c}`} onClick={() => setTrail(c)} />
            ))}
            <span className="chip" data-active>LED</span>
            {LED_COLORS.map((c) => (
              <button key={c} className="chip" style={{ background: c, color: c === "#FFF8EC" ? "#3A3A3A" : "#FFF" }} aria-label={`LED ${c}`} onClick={() => setLed(c)} />
            ))}
          </div>
          <div className="toolbar">
            <button className="chip" onClick={() => setFriction(Math.max(0.05, stateRef.current.friction - 0.1))}>마찰 −</button>
            <span className="chip" data-active>마찰 {stateRef.current.friction.toFixed(2)}</span>
            <button className="chip" onClick={() => setFriction(Math.min(2, stateRef.current.friction + 0.1))}>마찰 +</button>
            <button className="chip" data-active onClick={boost}>⚡ 부스트(Space)</button>
            <button className="chip" data-active={gyroEnabled} onClick={async () => {
              if (!gyroEnabled) { const ok = await gyro.requestPermission(); setGyroEnabled(ok); }
              else setGyroEnabled(false);
            }}>📱 자이로</button>
            <button className="chip" data-active={micOn} onClick={() => setMicOn(!micOn)} disabled={!soundOn}>🎤 후~~</button>
          </div>
          <div className="stat-row">
            <span className="stat">RPM <strong>{Math.round(rpmDisplay)}</strong></span>
            <span className="stat">최고 <strong>{Math.round(maxRpm)}</strong></span>
            <span className="stat">누적 RPM <strong>{useApp.getState().stats.spinRpmTotal.toLocaleString()}</strong></span>
          </div>
        </>
      )}
      <SpinnerCanvas state={stateRef.current} onRpm={onRpm} />
      {!embed && <p style={{ color: "var(--charcoal-soft)", fontSize: "0.85rem" }}>플릭 드래그로 회전 · Space 부스트 · 모바일은 자이로/스와이프</p>}
    </div>
  );
}
