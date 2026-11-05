import { LUDO_COLORS, trackIndex, type LudoColor } from '../engine/ludoEngine.ts';
import type { Cell } from './geometry.ts';

function point(sector: number, radius: number, sideways = 0): Cell {
  const angle = sector * Math.PI / 3 - Math.PI / 2;
  return { x: 7.5 + Math.cos(angle) * radius - Math.sin(angle) * sideways,
    y: 7.5 + Math.sin(angle) * radius + Math.cos(angle) * sideways };
}
export const SIX_TRACK = Array.from({ length: 6 }, (_, sector) => [
  ...Array.from({ length: 6 }, (_, i) => point(sector, 2.1 + i * 0.76, -0.72)),
  point(sector, 6.66),
  ...Array.from({ length: 6 }, (_, i) => point(sector, 5.9 - i * 0.76, 0.72)),
]).flat();
export const SIX_HOMES = Object.fromEntries(LUDO_COLORS.map((color, sector) =>
  [color, Array.from({ length: 6 }, (_, i) => point(sector, 5.9 - i * 0.76))])) as Record<LudoColor, Cell[]>;
export const SIX_YARDS = Object.fromEntries(LUDO_COLORS.map((color, sector) => {
  const center = point(sector + 0.5, 4.55);
  return [color, Array.from({ length: 4 }, (_, i) => ({ x: center.x + (i % 2 ? 0.48 : -0.48), y: center.y + (i > 1 ? 0.48 : -0.48) }))];
})) as Record<LudoColor, Cell[]>;
export function sixTokenCell(color: LudoColor, index: number, progress: number): Cell {
  return progress < 0 ? SIX_YARDS[color][index] : progress < 78 ? SIX_TRACK[trackIndex(color, progress, true)]
    : progress < 84 ? SIX_HOMES[color][progress - 78] : { x: 7.5, y: 7.5 };
}
