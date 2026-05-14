import { useEffect, useRef, useState } from "react";
import { drawKeycap, keycapPixelSize, UNIT_PX } from "./render";
import { playKeycapSound } from "./sound";
import {
  defaultDesign, FONTS, MATERIALS, PRESETS, PROFILES,
  type Finish, type KeycapDesign, type LegendFont, type LegendStyle, type Material,
  type Profile, type Size, type SoundType,
} from "./types";
import { useApp } from "../../shared/store";
import { haptic } from "../../shared/input/useHaptic";
import { bumpCounter } from "../../shared/supabase/counter";

interface Props { embed?: boolean }

const PROFILE_KEYS = Object.keys(PROFILES) as Profile[];
const MATERIAL_KEYS = Object.keys(MATERIALS) as Material[];
const SIZES: Size[] = [1, 2, 3];
const SOUNDS: SoundType[] = ["click", "thock", "clack", "creamy"];
const FINISHES: Finish[] = ["smooth", "textured", "satin", "glossy"];
const STYLES: { v: LegendStyle; label: string }[] = [
  { v: "top-center", label: "윗면 가운데" },
  { v: "top-left",   label: "윗면 좌상단" },
  { v: "front",      label: "전면각인" },
  { v: "none",       label: "민자(블랭크)" },
];
const FONT_KEYS = Object.keys(FONTS) as LegendFont[];
const NOVELTIES: { v: KeycapDesign["novelty"]; label: string }[] = [
  { v: "none", label: "없음" },
  { v: "blossom", label: "🌸 꽃" },
  { v: "moon", label: "🌙 달" },
  { v: "wave", label: "🌊 파도" },
  { v: "smiley", label: "🙂 스마일" },
  { v: "heart", label: "💗 하트" },
];

// Quick-pick palettes
const TOP_PALETTE = ["#F4E3D7","#FFD9C0","#FFC9D6","#E0D4F7","#C9E4FF","#C9F0E0","#FFE38F","#FFB99A","#1F1F1F","#3A3A3A","#FFFFFF","#A8C896"];
const SIDE_PALETTE = ["#3A1F26","#1A1A1A","#3F5944","#2F4858","#6BC8FF","#7A4F6B","#C57A52","#0B0820","#B89BE8","#7BAFD4","#D88BA0","#4A0F1A"];
const LEGEND_PALETTE = ["#3A3A3A","#FFFFFF","#FFE08F","#FF6BD3","#6BFFE4","#FF4444","#7A2D45","#2C4A6B"];
const GLOW_PALETTE = [null,"#FF6BD3","#6BFFE4","#B89BE8","#FFE08F","#6BB6FF","#FF4444","#FFFFFF"];

const STORAGE_KEY = "hcw-keycap-builds";

interface SavedBuild { id: string; design: KeycapDesign; createdAt: string }

function loadBuilds(): SavedBuild[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveBuilds(b: SavedBuild[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(b.slice(0, 30)));
}

export default function KeycapPage({ embed }: Props) {
  const [design, setDesign] = useState<KeycapDesign>(defaultDesign);
  const [pressedAt, setPressedAt] = useState(0);
  const [tab, setTab] = useState<"design" | "row" | "saved">("design");
  const [row, setRow] = useState<KeycapDesign[]>(() => [defaultDesign()]);
  const [selectedRowIdx, setSelectedRowIdx] = useState(0);
  const [builds, setBuilds] = useState<SavedBuild[]>(() => loadBuilds());
  const reducedMotion = useApp((s) => s.reducedMotion);
  const unlock = useApp((s) => s.unlock);
  const bumpStat = useApp((s) => s.bumpStat);

  const designerRef = useRef<HTMLCanvasElement>(null);
  const rowRef = useRef<HTMLCanvasElement>(null);

  const update = (patch: Partial<KeycapDesign>) => setDesign((d) => ({ ...d, ...patch }));

  // Single keycap designer canvas
  useEffect(() => {
    const c = designerRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { w, h } = keycapPixelSize(design);
    const pad = 60;
    c.width = (w + pad * 2) * dpr;
    c.height = (h + pad * 2) * dpr;
    c.style.width = `${(w + pad * 2)}px`;
    c.style.height = `${(h + pad * 2)}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.width / dpr, c.height / dpr);
    const since = performance.now() - pressedAt;
    const pressed = !reducedMotion && since < 150;
    drawKeycap(ctx, pad, pad, design, { pressed });
    if (pressed) {
      // schedule a redraw for animation end
      const id = setTimeout(() => setPressedAt((p) => p), 160);
      return () => clearTimeout(id);
    }
  }, [design, pressedAt, reducedMotion]);

  // Row builder canvas
  useEffect(() => {
    if (tab !== "row") return;
    const c = rowRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const totalW = row.reduce((s, d) => s + UNIT_PX * d.size, 0) + (row.length + 1) * 16;
    const h = UNIT_PX * 1.05 + 80;
    c.width = totalW * dpr;
    c.height = h * dpr;
    c.style.width = `${totalW}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, totalW, h);
    let x = 16;
    row.forEach((d, i) => {
      drawKeycap(ctx, x, 30, d, { selected: i === selectedRowIdx });
      x += UNIT_PX * d.size + 16;
    });
  }, [row, selectedRowIdx, tab]);

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    update({
      topColor: p.topColor,
      sideColor: p.sideColor,
      legendColor: p.legendColor,
      underglow: p.underglow ?? null,
      legendFont: p.legendFont ?? design.legendFont,
    });
  };

  const onTap = () => {
    playKeycapSound(design.sound);
    haptic(8);
    setPressedAt(performance.now());
    unlock("first-keycap");
    bumpStat("wakppuPresses", 1); // share keycap presses with the wakppu counter for the grand-slam check
    bumpCounter("wakppu_presses", 1);
  };

  const onRowClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = rowRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let acc = 16;
    for (let i = 0; i < row.length; i++) {
      const w = UNIT_PX * row[i].size + 16;
      if (x >= acc && x < acc + w) {
        setSelectedRowIdx(i);
        setDesign(row[i]);
        playKeycapSound(row[i].sound);
        return;
      }
      acc += w;
    }
  };

  const addToRow = () => setRow((r) => {
    const next = [...r, { ...design }];
    if (next.length >= 5) unlock("keycap-row");
    return next;
  });
  const updateSelectedInRow = () => setRow((r) => r.map((d, i) => i === selectedRowIdx ? { ...design } : d));
  const removeFromRow = () => setRow((r) => r.filter((_, i) => i !== selectedRowIdx).length ? r.filter((_, i) => i !== selectedRowIdx) : r);

  const saveBuild = () => {
    const next: SavedBuild[] = [{ id: crypto.randomUUID(), design, createdAt: new Date().toISOString() }, ...builds];
    setBuilds(next);
    saveBuilds(next);
    unlock("keycap-saved");
  };
  const loadBuild = (b: SavedBuild) => setDesign(b.design);
  const deleteBuild = (id: string) => {
    const next = builds.filter((b) => b.id !== id);
    setBuilds(next);
    saveBuilds(next);
  };

  const exportPNG = (which: "single" | "row") => {
    const c = which === "single" ? designerRef.current : rowRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keycap-${which}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="game-page">
      {!embed && (
        <div className="toolbar">
          <button className="chip" data-active={tab === "design"} onClick={() => setTab("design")}>🎨 디자이너</button>
          <button className="chip" data-active={tab === "row"} onClick={() => setTab("row")}>⌨️ 한 줄 빌드</button>
          <button className="chip" data-active={tab === "saved"} onClick={() => setTab("saved")}>💾 내 빌드 ({builds.length})</button>
        </div>
      )}

      {tab === "design" && (
        <>
          <div className="canvas-wrap" style={{ aspectRatio: "auto", width: "auto", maxWidth: "none", background: "var(--cream)", padding: "1rem" }}>
            <canvas
              ref={designerRef}
              onPointerDown={onTap}
              role="button"
              aria-label={`${design.legend} 키캡 — 눌러서 소리 듣기`}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTap(); }}
              style={{ cursor: "pointer", touchAction: "none" }}
            />
          </div>

          {!embed && (
            <>
              <Section title="🌈 프리셋 테마">
                <div className="toolbar" style={{ maxWidth: 900, flexWrap: "wrap" }}>
                  {PRESETS.map((p) => (
                    <button key={p.id} className="chip" onClick={() => applyPreset(p.id)}
                      style={{ background: `linear-gradient(135deg, ${p.topColor} 60%, ${p.sideColor} 60%)`, color: p.legendColor }}>
                      {p.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="📏 사이즈 · 프로파일 · 재질">
                <div className="toolbar">
                  {SIZES.map((s) => (
                    <button key={s} className="chip" data-active={design.size === s} onClick={() => update({ size: s })}>{s}u</button>
                  ))}
                </div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  {PROFILE_KEYS.map((p) => (
                    <button key={p} className="chip" data-active={design.profile === p} onClick={() => update({ profile: p })} title={PROFILES[p].description}>
                      {PROFILES[p].name}
                    </button>
                  ))}
                </div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  {MATERIAL_KEYS.map((m) => (
                    <button key={m} className="chip" data-active={design.material === m} onClick={() => update({ material: m })} title={MATERIALS[m].description}>
                      {MATERIALS[m].emoji} {MATERIALS[m].name}
                    </button>
                  ))}
                </div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  {FINISHES.map((f) => (
                    <button key={f} className="chip" data-active={design.finish === f} onClick={() => update({ finish: f })}>
                      {f === "smooth" ? "매트" : f === "textured" ? "텍스처" : f === "satin" ? "새틴" : "글로시"}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="🎨 색상">
                <ColorRow label="윗면" colors={TOP_PALETTE} value={design.topColor} onChange={(c) => update({ topColor: c })} />
                <ColorRow label="옆면" colors={SIDE_PALETTE} value={design.sideColor} onChange={(c) => update({ sideColor: c })} />
                <ColorRow label="레전드" colors={LEGEND_PALETTE} value={design.legendColor} onChange={(c) => update({ legendColor: c })} />
                <ColorRow label="언더글로우" colors={GLOW_PALETTE as (string | null)[]} value={design.underglow} onChange={(c) => update({ underglow: c })} allowNull />
                <div className="toolbar" style={{ marginTop: 8 }}>
                  <label className="chip">
                    윗면 직접
                    <input type="color" value={design.topColor} onChange={(e) => update({ topColor: e.target.value })} style={{ marginLeft: 6, border: "none", background: "transparent", width: 24, height: 24 }} />
                  </label>
                  <label className="chip">
                    옆면 직접
                    <input type="color" value={design.sideColor} onChange={(e) => update({ sideColor: e.target.value })} style={{ marginLeft: 6, border: "none", background: "transparent", width: 24, height: 24 }} />
                  </label>
                  <label className="chip">
                    레전드 직접
                    <input type="color" value={design.legendColor} onChange={(e) => update({ legendColor: e.target.value })} style={{ marginLeft: 6, border: "none", background: "transparent", width: 24, height: 24 }} />
                  </label>
                </div>
              </Section>

              <Section title="🔤 레전드 (각인)">
                <div className="toolbar">
                  <input
                    value={design.legend}
                    onChange={(e) => update({ legend: e.target.value.slice(0, 8) })}
                    placeholder="문자/이모지"
                    maxLength={8}
                    style={{ padding: "0.5rem 0.9rem", borderRadius: "var(--radius-pill)", border: "none", background: "var(--white)", boxShadow: "var(--shadow-sm)", fontSize: "1rem", width: 140, fontFamily: FONTS[design.legendFont] }}
                  />
                  <input
                    value={design.sublegend}
                    onChange={(e) => update({ sublegend: e.target.value.slice(0, 4) })}
                    placeholder="서브"
                    maxLength={4}
                    style={{ padding: "0.5rem 0.9rem", borderRadius: "var(--radius-pill)", border: "none", background: "var(--white)", boxShadow: "var(--shadow-sm)", fontSize: "0.85rem", width: 80 }}
                  />
                </div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  {FONT_KEYS.map((f) => (
                    <button key={f} className="chip" data-active={design.legendFont === f} onClick={() => update({ legendFont: f })} style={{ fontFamily: FONTS[f] }}>{f}</button>
                  ))}
                </div>
                <div className="toolbar" style={{ marginTop: 8 }}>
                  {STYLES.map((s) => (
                    <button key={s.v} className="chip" data-active={design.legendStyle === s.v} onClick={() => update({ legendStyle: s.v })}>{s.label}</button>
                  ))}
                </div>
              </Section>

              <Section title="✨ 노벨티 그래픽">
                <div className="toolbar">
                  {NOVELTIES.map((n) => (
                    <button key={n.v} className="chip" data-active={design.novelty === n.v} onClick={() => update({ novelty: n.v })}>{n.label}</button>
                  ))}
                </div>
              </Section>

              <Section title="🔊 타이핑 사운드">
                <div className="toolbar">
                  {SOUNDS.map((s) => (
                    <button key={s} className="chip" data-active={design.sound === s} onClick={() => { update({ sound: s }); playKeycapSound(s); }}>
                      {s === "click" ? "🖱 클릭" : s === "thock" ? "🪵 톡" : s === "clack" ? "🥢 크락" : "🍦 크리미"}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--charcoal-soft)", marginTop: 6 }}>키캡을 직접 눌러도 소리가 나요</p>
              </Section>

              <Section title="💾 내보내기">
                <div className="toolbar">
                  <button className="chip" data-active onClick={() => exportPNG("single")}>📷 PNG 저장</button>
                  <button className="chip" onClick={saveBuild}>💾 빌드 저장</button>
                  <button className="chip" onClick={() => setDesign(defaultDesign())}>🔄 초기화</button>
                </div>
              </Section>
            </>
          )}
        </>
      )}

      {tab === "row" && !embed && (
        <>
          <div className="canvas-wrap" style={{ aspectRatio: "auto", maxWidth: "none", width: "auto", overflowX: "auto", background: "var(--cream)" }}>
            <canvas ref={rowRef} onClick={onRowClick} style={{ cursor: "pointer" }} />
          </div>
          <div className="toolbar">
            <button className="chip" data-active onClick={addToRow}>➕ 추가</button>
            <button className="chip" onClick={updateSelectedInRow}>🔁 선택 키 → 현재 디자인으로</button>
            <button className="chip" onClick={removeFromRow} disabled={row.length <= 1}>🗑 삭제</button>
            <button className="chip" onClick={() => exportPNG("row")}>📷 PNG 저장</button>
          </div>
          <p style={{ color: "var(--charcoal-soft)", fontSize: "0.85rem" }}>
            한 줄에 키캡을 배치해보세요. 칸을 클릭하면 디자이너로 불러와 편집해요.
          </p>
        </>
      )}

      {tab === "saved" && !embed && (
        <div style={{ width: "100%", maxWidth: 900 }}>
          {builds.length === 0 && <p style={{ color: "var(--charcoal-soft)" }}>아직 저장된 빌드가 없어요. 디자이너에서 💾 빌드 저장을 눌러보세요.</p>}
          <div className="home-grid" style={{ marginTop: "1rem" }}>
            {builds.map((b) => (
              <div key={b.id} className="home-card" style={{ minHeight: 0 }}>
                <SavedPreview design={b.design} />
                <p style={{ fontSize: "0.8rem", color: "var(--charcoal-soft)" }}>{new Date(b.createdAt).toLocaleString()}</p>
                <div className="toolbar" style={{ background: "transparent", boxShadow: "none", padding: 0 }}>
                  <button className="chip" onClick={() => loadBuild(b)}>불러오기</button>
                  <button className="chip" onClick={() => deleteBuild(b.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ width: "100%", maxWidth: 900 }}>
      <h2 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "1rem 0 0.5rem 0", color: "var(--charcoal-soft)" }}>{title}</h2>
      {children}
    </section>
  );
}

function ColorRow<T extends string | null>({ label, colors, value, onChange, allowNull }: { label: string; colors: T[]; value: T; onChange: (c: T) => void; allowNull?: boolean }) {
  return (
    <div className="toolbar" style={{ marginTop: 8, justifyContent: "flex-start" }}>
      <span className="chip" data-active>{label}</span>
      {colors.map((c, i) => (
        <button
          key={i}
          className="chip"
          aria-label={c ?? "없음"}
          onClick={() => onChange(c)}
          style={{
            background: c ?? "repeating-linear-gradient(45deg, #FFE3EC, #FFE3EC 4px, #FFF 4px, #FFF 8px)",
            color: value === c ? "#3A3A3A" : "transparent",
            border: value === c ? "2px solid #B89BE8" : "2px solid transparent",
            minWidth: 28,
            padding: "0.4rem 0.6rem",
          }}
        >
          {c === null && allowNull ? "✕" : "●"}
        </button>
      ))}
    </div>
  );
}

function SavedPreview({ design }: { design: KeycapDesign }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = 0.55;
    const { w, h } = keycapPixelSize(design);
    c.width = (w * scale + 20) * dpr;
    c.height = (h * scale + 20) * dpr;
    c.style.width = `${w * scale + 20}px`;
    c.style.height = `${h * scale + 20}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * 10, dpr * 10);
    drawKeycap(ctx, 0, 0, design);
  }, [design]);
  return <canvas ref={ref} />;
}
