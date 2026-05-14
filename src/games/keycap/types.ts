export type Profile = "cherry" | "oem" | "sa" | "dsa" | "xda" | "mt3" | "kat";
export type Material = "abs" | "pbt" | "pom" | "resin";
export type Size = 1 | 2 | 3;
export type SoundType = "click" | "thock" | "clack" | "creamy";
export type Finish = "smooth" | "textured" | "satin" | "glossy";
export type LegendStyle = "top-center" | "top-left" | "front" | "none";
export type LegendFont = "sans" | "mono" | "rounded" | "pixel" | "serif";

export interface KeycapDesign {
  profile: Profile;
  material: Material;
  size: Size;
  topColor: string;
  sideColor: string;
  legend: string;
  legendColor: string;
  legendFont: LegendFont;
  legendStyle: LegendStyle;
  sublegend: string;
  underglow: string | null;
  finish: Finish;
  sound: SoundType;
  novelty: "none" | "blossom" | "moon" | "wave" | "smiley" | "heart";
}

export interface ProfileSpec {
  name: string;
  description: string;
  topInsetRatio: number;   // how much smaller the top is vs base
  topLiftRatio: number;    // how much the top floats above base (visual)
  topRadiusRatio: number;  // roundness of top rect
  baseRadiusRatio: number; // roundness of base rect
  spherical: boolean;      // spherical (SA/DSA) vs cylindrical
  sculpted: boolean;       // sculpted profile (SA/MT3/KAT) vs uniform (DSA/XDA)
  legendSizeRatio: number; // legend font size relative to keycap width
}

export const PROFILES: Record<Profile, ProfileSpec> = {
  cherry:  { name: "Cherry",  description: "낮고 각진 베스트셀러",        topInsetRatio: 0.14, topLiftRatio: 0.06, topRadiusRatio: 0.06, baseRadiusRatio: 0.10, spherical: false, sculpted: true,  legendSizeRatio: 0.32 },
  oem:     { name: "OEM",     description: "표준 노트북 키",              topInsetRatio: 0.12, topLiftRatio: 0.07, topRadiusRatio: 0.07, baseRadiusRatio: 0.10, spherical: false, sculpted: true,  legendSizeRatio: 0.34 },
  sa:      { name: "SA",      description: "높고 동그란 빈티지",          topInsetRatio: 0.22, topLiftRatio: 0.14, topRadiusRatio: 0.20, baseRadiusRatio: 0.10, spherical: true,  sculpted: true,  legendSizeRatio: 0.30 },
  dsa:     { name: "DSA",     description: "낮고 균일한 구면",            topInsetRatio: 0.18, topLiftRatio: 0.05, topRadiusRatio: 0.30, baseRadiusRatio: 0.14, spherical: true,  sculpted: false, legendSizeRatio: 0.30 },
  xda:     { name: "XDA",     description: "넓은 윗면, 균일",              topInsetRatio: 0.10, topLiftRatio: 0.05, topRadiusRatio: 0.16, baseRadiusRatio: 0.12, spherical: true,  sculpted: false, legendSizeRatio: 0.36 },
  mt3:     { name: "MT3",     description: "깊게 파인 스쿠프",            topInsetRatio: 0.20, topLiftRatio: 0.16, topRadiusRatio: 0.10, baseRadiusRatio: 0.08, spherical: true,  sculpted: true,  legendSizeRatio: 0.30 },
  kat:     { name: "KAT",     description: "중간 높이, 부드러움",         topInsetRatio: 0.18, topLiftRatio: 0.10, topRadiusRatio: 0.22, baseRadiusRatio: 0.14, spherical: true,  sculpted: true,  legendSizeRatio: 0.32 },
};

export interface MaterialSpec {
  name: string;
  emoji: string;
  glossiness: number;
  description: string;
}

export const MATERIALS: Record<Material, MaterialSpec> = {
  abs:   { name: "ABS",   emoji: "✨", glossiness: 0.6, description: "광택이 있고 가벼움" },
  pbt:   { name: "PBT",   emoji: "🪨", glossiness: 0.15, description: "텍스처감, 무거움" },
  pom:   { name: "POM",   emoji: "🥛", glossiness: 0.35, description: "매끄럽고 부드러움" },
  resin: { name: "Resin", emoji: "💎", glossiness: 0.9, description: "투명/반투명 아트키캡" },
};

export const FONTS: Record<LegendFont, string> = {
  sans:    `"Pretendard","Apple SD Gothic Neo",system-ui,sans-serif`,
  mono:    `"SF Mono",ui-monospace,monospace`,
  rounded: `"Pretendard Rounded","Apple SD Gothic Neo",system-ui,sans-serif`,
  pixel:   `"Press Start 2P","Courier New",monospace`,
  serif:   `"Times New Roman",serif`,
};

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  topColor: string;
  sideColor: string;
  legendColor: string;
  underglow?: string | null;
  legendFont?: LegendFont;
}

export const PRESETS: Preset[] = [
  { id: "olivia",       name: "Olivia",       emoji: "🤍", topColor: "#F4E3D7", sideColor: "#3A1F26", legendColor: "#3A1F26" },
  { id: "botanical",    name: "Botanical",    emoji: "🌿", topColor: "#EADCC0", sideColor: "#3F5944", legendColor: "#FFFFFF" },
  { id: "skyline",      name: "Skyline",      emoji: "🌆", topColor: "#9DC7E0", sideColor: "#2F4858", legendColor: "#FFFFFF" },
  { id: "dolch",        name: "Modern Dolch", emoji: "⬛", topColor: "#3A3A3A", sideColor: "#1A1A1A", legendColor: "#FFE08F" },
  { id: "carbon",       name: "Carbon",       emoji: "🖤", topColor: "#1F1F1F", sideColor: "#0A0A0A", legendColor: "#E8E8E8" },
  { id: "9009",         name: "9009",         emoji: "📺", topColor: "#E8E0CC", sideColor: "#7C8186", legendColor: "#3A3A3A" },
  { id: "laser",        name: "Laser",        emoji: "💖", topColor: "#FF66B2", sideColor: "#6BC8FF", legendColor: "#FFFFFF", underglow: "#FF6BD3" },
  { id: "pulse",        name: "Pulse",        emoji: "🌸", topColor: "#F4C6D5", sideColor: "#7A4F6B", legendColor: "#FFFFFF" },
  { id: "milkshake",    name: "Milkshake",    emoji: "🥛", topColor: "#FFF1E0", sideColor: "#FFB8A0", legendColor: "#7A5A4A" },
  { id: "mintchoco",    name: "민트초코",     emoji: "🍫", topColor: "#C9F0E0", sideColor: "#3F2A22", legendColor: "#3F2A22" },
  { id: "peach",        name: "복숭아",       emoji: "🍑", topColor: "#FFD9C0", sideColor: "#C57A52", legendColor: "#FFFFFF" },
  { id: "macaron",      name: "마카롱",       emoji: "🧁", topColor: "#FFE3EC", sideColor: "#B89BE8", legendColor: "#7A4F6B" },
  { id: "matcha",       name: "말차",         emoji: "🍵", topColor: "#A8C896", sideColor: "#3F5944", legendColor: "#FFFFFF" },
  { id: "honey",        name: "허니",         emoji: "🍯", topColor: "#FFD56B", sideColor: "#C58F2C", legendColor: "#3F2A0F" },
  { id: "cyberpunk",    name: "사이버펑크",   emoji: "✨", topColor: "#1A0F38", sideColor: "#0B0820", legendColor: "#6BFFE4", underglow: "#FF6BD3" },
  { id: "vaporwave",    name: "베이퍼웨이브", emoji: "🌴", topColor: "#FF6BD3", sideColor: "#6BB6FF", legendColor: "#FFFFFF", underglow: "#B86BFF" },
  { id: "iceberg",      name: "빙하",         emoji: "🧊", topColor: "#DCEEFF", sideColor: "#7BAFD4", legendColor: "#2C4A6B" },
  { id: "sakura",       name: "벚꽃",         emoji: "🌸", topColor: "#FFD6E0", sideColor: "#D88BA0", legendColor: "#7A2D45" },
  { id: "samurai",      name: "사무라이",     emoji: "⚔️", topColor: "#1F1F1F", sideColor: "#4A0F1A", legendColor: "#FF4444" },
  { id: "lavender",     name: "라벤더",       emoji: "💜", topColor: "#E0D4F7", sideColor: "#8C6BC8", legendColor: "#FFFFFF" },
];

export function defaultDesign(): KeycapDesign {
  return {
    profile: "cherry",
    material: "pbt",
    size: 1,
    topColor: "#F4E3D7",
    sideColor: "#3A1F26",
    legend: "A",
    legendColor: "#3A1F26",
    legendFont: "sans",
    legendStyle: "top-center",
    sublegend: "",
    underglow: null,
    finish: "smooth",
    sound: "thock",
    novelty: "none",
  };
}
