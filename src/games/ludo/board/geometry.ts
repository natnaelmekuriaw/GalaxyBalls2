import { FINISH, SAFE_INDEX, START_INDEX, trackIndex, type LudoColor } from '../engine/ludoEngine.ts';

export type Cell = { x: number; y: number };

export const TRACK: Cell[] = [
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

export const HOME_LANES: Record<LudoColor, Cell[]> = {
  red: Array.from({ length: 6 }, (_, offset) => ({ x: 7, y: offset + 1 })),
  green: Array.from({ length: 6 }, (_, offset) => ({ x: offset + 1, y: 7 })),
  yellow: Array.from({ length: 6 }, (_, offset) => ({ x: 7, y: 13 - offset })),
  blue: Array.from({ length: 6 }, (_, offset) => ({ x: 13 - offset, y: 7 })),
};

export const YARDS: Record<LudoColor, Cell[]> = {
  red: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 1, y: 4 }, { x: 4, y: 4 }],
  green: [{ x: 1, y: 10 }, { x: 4, y: 10 }, { x: 1, y: 13 }, { x: 4, y: 13 }],
  yellow: [{ x: 10, y: 10 }, { x: 13, y: 10 }, { x: 10, y: 13 }, { x: 13, y: 13 }],
  blue: [{ x: 10, y: 1 }, { x: 13, y: 1 }, { x: 10, y: 4 }, { x: 13, y: 4 }],
};

export const COLORS: Record<LudoColor, string> = {
  red: '#F36E75', green: '#50C99D', yellow: '#F2C760', blue: '#69A9F5',
};

export function tokenCell(color: LudoColor, token: number, progress: number): Cell {
  if (progress === -1) return YARDS[color][token];
  if (progress < 52) return TRACK[trackIndex(color, progress)];
  if (progress < FINISH) return HOME_LANES[color][progress - 52];
  return { x: 7, y: 7 };
}

export function cellColor(x: number, y: number): LudoColor | null {
  if (x < 6 && y < 6) return 'red';
  if (x < 6 && y > 8) return 'green';
  if (x > 8 && y > 8) return 'yellow';
  if (x > 8 && y < 6) return 'blue';
  for (const color of Object.keys(HOME_LANES) as LudoColor[]) {
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
