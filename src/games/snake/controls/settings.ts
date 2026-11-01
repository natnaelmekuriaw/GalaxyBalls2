export const CONTROL_SIZES = ['SMALL', 'LARGE', 'EXTRA_LARGE'] as const;
export type SnakeControlSize = (typeof CONTROL_SIZES)[number];
export const CONTROL_SIZE_LABELS = { SMALL: 'small', LARGE: 'large', EXTRA_LARGE: 'extraLarge' } as const;

export type SnakeControlSettings = {
  style: 'BUTTONS' | 'ANALOG';
  size: SnakeControlSize;
  locked: boolean;
  position: { x: number; y: number };
};

export function createDefaultControlSettings(): SnakeControlSettings {
  return { style: 'BUTTONS', size: 'SMALL', locked: true, position: { x: 1, y: 1 } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coordinate(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

/** Each field falls back independently; patches can retain the current valid choices. */
export function parseControlSettings(
  value: unknown, fallback: SnakeControlSettings = createDefaultControlSettings(),
): SnakeControlSettings {
  const saved = isRecord(value) ? value : {};
  const position = isRecord(saved.position) ? saved.position : {};
  return {
    style: saved.style === 'BUTTONS' || saved.style === 'ANALOG' ? saved.style : fallback.style,
    size: saved.size === 'SMALL' || saved.size === 'LARGE' || saved.size === 'EXTRA_LARGE' ? saved.size : fallback.size,
    locked: typeof saved.locked === 'boolean' ? saved.locked : fallback.locked,
    position: { x: coordinate(position.x, fallback.position.x), y: coordinate(position.y, fallback.position.y) },
  };
}
