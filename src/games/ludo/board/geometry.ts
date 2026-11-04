import { FINISH, SAFE_INDEX, START_INDEX, trackIndex, type LudoColor } from '../engine/ludoEngine.ts';

export type Cell = { x: number; y: number };

const RAW_TRACK: Cell[] = [
  ...Array.from({ length: 5 }, (_, offset) => ({ x: 6, y: offset + 1 })),
  ...Array.from({ length: 6 }, (_, offset) => ({ x: 5 - offset, y: 6 })),
  { x: 0, y: 7 }, { x: 0, y: 8 },
  ...Array.from({ length: 5 }, (_, offset) => ({ x: offset + 1, y: 8 })),
  ...Array.from({ length: 6 }, (_, offset) => ({ x: 6, y: offset + 9 })),
  { x: 7, y: 14 }, { x: 8, y: 14 },
  ...Array.from({ length: 5 }, (_, offset) => ({ x: 8, y: 13 - offset })),
  ...Array.from({ length: 6 }, (_, offset) => ({ x: offset + 9, y: 8 })),
  { x: 14, y: 7 }, { x: 14, y: 6 },
  ...Array.from({ length: 5 }, (_, offset) => ({ x: 13 - offset, y: 6 })),
  ...Array.from({ length: 6 }, (_, offset) => ({ x: 8, y: 5 - offset })),
  { x: 7, y: 0 }, { x: 6, y: 0 },
];

const RAW_HOME_LANES: Record<LudoColor, Cell[]> = {
  red: Array.from({ length: 6 }, (_, offset) => ({ x: 7, y: offset + 1 })),
  green: Array.from({ length: 6 }, (_, offset) => ({ x: offset + 1, y: 7 })),
  yellow: Array.from({ length: 6 }, (_, offset) => ({ x: 7, y: 13 - offset })),
  purple: [], orange: [],
  blue: Array.from({ length: 6 }, (_, offset) => ({ x: 13 - offset, y: 7 })),
};

const RAW_YARDS: Record<LudoColor, Cell[]> = {
  red: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 1, y: 4 }, { x: 4, y: 4 }],
  green: [{ x: 1, y: 10 }, { x: 4, y: 10 }, { x: 1, y: 13 }, { x: 4, y: 13 }],
  yellow: [{ x: 10, y: 10 }, { x: 13, y: 10 }, { x: 10, y: 13 }, { x: 13, y: 13 }],
  purple: [], orange: [],
  blue: [{ x: 10, y: 1 }, { x: 13, y: 1 }, { x: 10, y: 4 }, { x: 13, y: 4 }],
};

const transpose = (point: Cell): Cell => ({ x: point.y, y: point.x });
export const TRACK = RAW_TRACK.map(transpose);
export const HOME_LANES = Object.fromEntries(Object.entries(RAW_HOME_LANES).map(([color, cells]) => [color, cells.map(transpose)])) as Record<LudoColor, Cell[]>;
export const YARDS = Object.fromEntries(Object.entries(RAW_YARDS).map(([color, cells]) => [color, cells.map(transpose)])) as Record<LudoColor, Cell[]>;

export const COLORS: Record<LudoColor, string> = {
  red: '#F5090A', green: '#00A51B', yellow: '#FFE000', blue: '#04AFE1', purple: '#9138C6', orange: '#F58216',
};

export function tokenCell(color: LudoColor, token: number, progress: number): Cell {
  if (progress === -1) return YARDS[color][token];
  if (progress < 52) return TRACK[trackIndex(color, progress)];
  if (progress < FINISH) return HOME_LANES[color][progress - 52];
  return { x: 7, y: 7 };
}

export function cellColor(x: number, y: number): LudoColor | null {
  if (x < 6 && y < 6) return 'red';
  if (x < 6 && y > 8) return 'blue';
  if (x > 8 && y > 8) return 'yellow';
  if (x > 8 && y < 6) return 'green';
  for (const color of ['red', 'green', 'yellow', 'blue'] as LudoColor[]) {
    if (HOME_LANES[color].some(cell => cell.x === x && cell.y === y)) return color;
    const start = TRACK[START_INDEX[color]];
    if (start.x === x && start.y === y) return color;
  }
  return null;
}

export function cellIsTrack(x: number, y: number): boolean {
  return TRACK.some(cell => cell.x === x && cell.y === y);
}

export function cellIsSafe(x: number, y: number): boolean {
  return TRACK.some((cell, index) => cell.x === x && cell.y === y && SAFE_INDEX.has(index));
}
