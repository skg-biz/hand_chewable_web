export type Shape = "round" | "heart" | "star" | "sausage";

export interface Cell {
  popped: boolean;
  trap: boolean;
  reward: boolean;
  flashAt: number;
}

export interface PopGridState {
  cols: number;
  rows: number;
  cells: Cell[];
  shape: Shape;
  scrollOffset: number;
}

export function createGrid(cols: number, rows: number, shape: Shape = "round"): PopGridState {
  const cells: Cell[] = [];
  for (let i = 0; i < cols * rows; i++) {
    cells.push({
      popped: false,
      trap: Math.random() < 0.02,
      reward: Math.random() < 0.01,
      flashAt: 0,
    });
  }
  return { cols, rows, cells, shape, scrollOffset: 0 };
}

export function reset(state: PopGridState) {
  for (const c of state.cells) {
    c.popped = false;
    c.flashAt = 0;
  }
}

export function popCell(state: PopGridState, col: number, row: number, t: number): { popped: boolean; trap: boolean; reward: boolean; chain: number } {
  if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) {
    return { popped: false, trap: false, reward: false, chain: 0 };
  }
  const idx = row * state.cols + col;
  const cell = state.cells[idx];
  if (cell.popped) return { popped: false, trap: false, reward: false, chain: 0 };
  cell.popped = true;
  cell.flashAt = t;
  let chain = 1;
  if (cell.trap) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nc = col + dx, nr = row + dy;
        if (nc >= 0 && nc < state.cols && nr >= 0 && nr < state.rows) {
          const ncell = state.cells[nr * state.cols + nc];
          if (!ncell.popped) {
            ncell.popped = true;
            ncell.flashAt = t;
            chain++;
          }
        }
      }
    }
  }
  return { popped: true, trap: cell.trap, reward: cell.reward, chain };
}

export function poppedCount(state: PopGridState): number {
  let n = 0;
  for (const c of state.cells) if (c.popped) n++;
  return n;
}

export function pickToFlash(state: PopGridState): number {
  // Random un-popped cell index for rhythm mode highlight
  const candidates: number[] = [];
  for (let i = 0; i < state.cells.length; i++) if (!state.cells[i].popped) candidates.push(i);
  if (!candidates.length) return -1;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
