import type { Direction } from '../engine/snakeEngine';

export function getDirectionForKey(key: string): Direction | null {
  switch (key.toLowerCase()) {
    case 'arrowup': case 'w': return 'UP';
    case 'arrowdown': case 's': return 'DOWN';
    case 'arrowleft': case 'a': return 'LEFT';
    case 'arrowright': case 'd': return 'RIGHT';
    default: return null;
  }
}

export function getSwipeDirection(dx: number, dy: number, threshold = 16): Direction | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(threshold) || threshold < 0
    || (dx === 0 && dy === 0) || Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy > 0 ? 'DOWN' : 'UP';
}
