import { FONTS, PROFILES, type KeycapDesign } from "./types";

export const UNIT_PX = 140; // 1u = 140px wide

export function keycapPixelSize(design: KeycapDesign): { w: number; h: number } {
  const w = UNIT_PX * design.size;
  const h = UNIT_PX * 1.05; // slightly taller than wide (front bevel)
  return { w, h };
}

interface DrawOptions {
  pressed?: boolean;       // pressed-down animation state (0..1)
  hover?: boolean;
  noShadow?: boolean;
  selected?: boolean;
}

export function drawKeycap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  design: KeycapDesign,
  opts: DrawOptions = {},
) {
  const prof = PROFILES[design.profile];
  const { w, h } = keycapPixelSize(design);
  const pressed = opts.pressed ? 6 : 0;
  const lift = w * prof.topLiftRatio - pressed;

  // Underglow (RGB halo around the base)
  if (design.underglow && !opts.noShadow) {
    const glow = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.2, x + w / 2, y + h / 2, w * 0.9);
    glow.addColorStop(0, hexA(design.underglow, 0.7));
    glow.addColorStop(1, hexA(design.underglow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - w * 0.3, y - h * 0.2, w * 1.6, h * 1.5);
  }

  // Drop shadow
  if (!opts.noShadow) {
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    roundRect(ctx, x + 6, y + h - 8, w, 16, w * 0.15);
    ctx.fill();
  }

  // BASE (side) — entire keycap footprint, slightly bigger than top
  const baseR = w * prof.baseRadiusRatio;
  ctx.fillStyle = design.sideColor;
  roundRect(ctx, x, y + lift * 0.4, w, h - lift * 0.4, baseR);
  ctx.fill();

  // Subtle bottom-side darkening
  const sideGrad = ctx.createLinearGradient(0, y, 0, y + h);
  sideGrad.addColorStop(0, "rgba(0,0,0,0)");
  sideGrad.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = sideGrad;
  roundRect(ctx, x, y + lift * 0.4, w, h - lift * 0.4, baseR);
  ctx.fill();

  // TOP surface
  const inset = w * prof.topInsetRatio;
  const topX = x + inset;
  const topY = y + inset * (prof.sculpted ? 0.55 : 0.85) - pressed * 0.5;
  const topW = w - inset * 2;
  const topH = h - inset * 2 - lift * 0.4;
  const topR = topW * prof.topRadiusRatio;

  // Top fill with subtle gradient (lighter at top)
  const topGrad = ctx.createLinearGradient(0, topY, 0, topY + topH);
  topGrad.addColorStop(0, lighten(design.topColor, 0.08));
  topGrad.addColorStop(1, design.topColor);
  ctx.fillStyle = topGrad;
  roundRect(ctx, topX, topY, topW, topH, topR);
  ctx.fill();

  // Spherical concave for SA/DSA/XDA/MT3/KAT
  if (prof.spherical) {
    const cx = topX + topW / 2;
    const cy = topY + topH / 2;
    const rGrad = ctx.createRadialGradient(cx, cy, topW * 0.05, cx, cy, topW * 0.55);
    rGrad.addColorStop(0, "rgba(0,0,0,0.08)");
    rGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rGrad;
    roundRect(ctx, topX, topY, topW, topH, topR);
    ctx.fill();
  }

  // Finish: glossy specular highlight
  if (design.finish === "glossy" || design.finish === "satin") {
    const alpha = design.finish === "glossy" ? 0.45 : 0.22;
    const hl = ctx.createLinearGradient(topX, topY, topX, topY + topH * 0.5);
    hl.addColorStop(0, `rgba(255,255,255,${alpha})`);
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    roundRect(ctx, topX + topW * 0.06, topY + topH * 0.08, topW * 0.88, topH * 0.4, topR * 0.8);
    ctx.fill();
  }

  // Textured finish: subtle stipple
  if (design.finish === "textured") {
    ctx.save();
    roundRect(ctx, topX, topY, topW, topH, topR);
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (let i = 0; i < topW * topH * 0.0025; i++) {
      ctx.fillRect(topX + Math.random() * topW, topY + Math.random() * topH, 1.2, 1.2);
    }
    ctx.restore();
  }

  // Inner border (subtle)
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, topX + 0.5, topY + 0.5, topW - 1, topH - 1, topR);
  ctx.stroke();

  // Novelty graphic (drawn behind legend)
  drawNovelty(ctx, design, topX, topY, topW, topH);

  // Legend
  drawLegend(ctx, design, topX, topY, topW, topH);

  // Sublegend
  if (design.sublegend) {
    ctx.fillStyle = hexA(design.legendColor, 0.75);
    ctx.font = `600 ${Math.round(topW * 0.16)}px ${FONTS[design.legendFont]}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(design.sublegend, topX + topW * 0.1, topY + topH - topH * 0.1);
  }

  // Selection ring
  if (opts.selected) {
    ctx.strokeStyle = "#B89BE8";
    ctx.lineWidth = 3;
    roundRect(ctx, x - 4, y - 4 + lift * 0.4, w + 8, h - lift * 0.4 + 8, baseR + 4);
    ctx.stroke();
  }
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  design: KeycapDesign,
  tx: number, ty: number, tw: number, th: number,
) {
  if (design.legendStyle === "none" || !design.legend) return;
  const prof = PROFILES[design.profile];
  const size = tw * prof.legendSizeRatio / Math.max(1, design.legend.length > 2 ? 1.6 : 1);
  ctx.fillStyle = design.legendColor;
  ctx.font = `700 ${Math.round(size)}px ${FONTS[design.legendFont]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (design.legendStyle === "top-center") {
    ctx.fillText(design.legend, tx + tw / 2, ty + th / 2);
  } else if (design.legendStyle === "top-left") {
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `700 ${Math.round(size * 0.8)}px ${FONTS[design.legendFont]}`;
    ctx.fillText(design.legend, tx + tw * 0.1, ty + th * 0.12);
  } else if (design.legendStyle === "front") {
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = `600 ${Math.round(size * 0.55)}px ${FONTS[design.legendFont]}`;
    ctx.fillText(design.legend, tx + tw / 2, ty + th - th * 0.05);
  }
}

function drawNovelty(
  ctx: CanvasRenderingContext2D,
  design: KeycapDesign,
  tx: number, ty: number, tw: number, th: number,
) {
  if (design.novelty === "none") return;
  ctx.save();
  const cx = tx + tw / 2;
  const cy = ty + th / 2;
  const r = Math.min(tw, th) * 0.32;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = hexA(design.legendColor, 0.4);
  ctx.strokeStyle = hexA(design.legendColor, 0.6);
  ctx.lineWidth = 2;
  if (design.novelty === "blossom") {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.45, r * 0.3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (design.novelty === "moon") {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx + r * 0.4, cy - r * 0.1, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  } else if (design.novelty === "wave") {
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = tx + (i / 60) * tw;
      const yy = cy + Math.sin((i / 60) * Math.PI * 4) * r * 0.4;
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  } else if (design.novelty === "smiley") {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.15, r * 0.08, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.35, cy - r * 0.15, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.05, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (design.novelty === "heart") {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.5);
    ctx.bezierCurveTo(cx - r * 1.2, cy - r * 0.2, cx - r * 0.4, cy - r, cx, cy - r * 0.3);
    ctx.bezierCurveTo(cx + r * 0.4, cy - r, cx + r * 1.2, cy - r * 0.2, cx, cy + r * 0.5);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function lighten(hex: string, amt: number): string {
  const { r, g, b } = parseHex(hex);
  const f = (v: number) => Math.min(255, Math.round(v + (255 - v) * amt));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function hexA(hex: string, a: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
}
