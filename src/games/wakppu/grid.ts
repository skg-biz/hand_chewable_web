export type WakppuMode = "free" | "wave" | "simon" | "soundpad" | "pixel";

export interface WakppuCell {
  raised: boolean;
  flashAt: number;
  color?: string;
}

export interface WakppuState {
  size: number;
  cells: WakppuCell[];
}

export function createBoard(size: number): WakppuState {
  return {
    size,
    cells: Array.from({ length: size * size }, () => ({ raised: true, flashAt: 0 })),
  };
}

export function press(state: WakppuState, idx: number, t: number, opts: { wave?: boolean } = {}): boolean {
  const cell = state.cells[idx];
  if (!cell) return false;
  cell.raised = !cell.raised;
  cell.flashAt = t;
  if (opts.wave) {
    const col = idx % state.size;
    const row = Math.floor(idx / state.size);
    const propagate = (c: number, r: number, delay: number) => {
      if (c < 0 || c >= state.size || r < 0 || r >= state.size) return;
      setTimeout(() => {
        const i = r * state.size + c;
        const target = state.cells[i];
        if (target) {
          target.raised = !target.raised;
          target.flashAt = performance.now();
        }
      }, delay);
    };
    propagate(col - 1, row, 70);
    propagate(col + 1, row, 70);
    propagate(col, row - 1, 70);
    propagate(col, row + 1, 70);
  }
  return true;
}

export function keyToIndex(key: string, size: number): number | null {
  const layouts: string[][] = [
    ["1","2","3","4","5","6","7","8","9","0"],
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l",";"],
    ["z","x","c","v","b","n","m",",",".","/"],
  ];
  const k = key.toLowerCase();
  for (let r = 0; r < layouts.length && r < size; r++) {
    const c = layouts[r].indexOf(k);
    if (c >= 0 && c < size) return r * size + c;
  }
  return null;
}
