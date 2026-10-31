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

const ANALOG_ANGLE: Record<Direction, number> = { RIGHT: 0, DOWN: 90, LEFT: 180, UP: -90 };

/** A wider exit angle keeps a held heading stable around diagonal boundaries. */
export function getAnalogDirection(
  dx: number, dy: number, previous: Direction | null = null, deadZone = 12,
): Direction | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(deadZone) || deadZone < 0
    || (dx === 0 && dy === 0) || Math.hypot(dx, dy) < deadZone) return null;
  if (previous !== null && Object.hasOwn(ANALOG_ANGLE, previous)) {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const difference = Math.abs((angle - ANALOG_ANGLE[previous] + 540) % 360 - 180);
    if (difference <= 57) return previous;
  }
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
  return dy > 0 ? 'DOWN' : 'UP';
}
