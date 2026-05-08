export interface ShareCardSpec {
  title: string;
  emoji: string;
  scoreLabel: string;
  scoreValue: string;
  subtitle?: string;
  themeColor?: string;
}

export async function buildShareCard(spec: ShareCardSpec): Promise<Blob | null> {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#FFE9F1");
  grad.addColorStop(0.5, "#FFF8EC");
  grad.addColorStop(1, "#E8F0FF");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = spec.themeColor ?? "#FFB99A";
  ctx.beginPath();
  ctx.arc(W / 2, H / 2 - 200, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "200px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#3A3A3A";
  ctx.fillText(spec.emoji, W / 2, H / 2 - 140);

  ctx.font = "700 96px Pretendard, system-ui, sans-serif";
  ctx.fillText(spec.title, W / 2, H / 2 + 80);

  ctx.font = "500 56px Pretendard, system-ui, sans-serif";
  ctx.fillStyle = "#6B6B6B";
  ctx.fillText(spec.scoreLabel, W / 2, H / 2 + 200);

  ctx.font = "800 200px Pretendard, system-ui, sans-serif";
  ctx.fillStyle = "#3A3A3A";
  ctx.fillText(spec.scoreValue, W / 2, H / 2 + 360);

  if (spec.subtitle) {
    ctx.font = "500 44px Pretendard, system-ui, sans-serif";
    ctx.fillStyle = "#8B7E70";
    ctx.fillText(spec.subtitle, W / 2, H / 2 + 440);
  }

  ctx.font = "600 40px Pretendard, system-ui, sans-serif";
  ctx.fillStyle = "#8B7E70";
  ctx.fillText("🫧 손씹는웹 · hand-chewable.web", W / 2, H - 80);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file], title: "손씹는웹" }); return; } catch { /* fall through */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
