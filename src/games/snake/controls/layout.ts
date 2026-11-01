import type { SnakeControlSettings } from './settings.ts';

export type ControlBounds = { width: number; height: number };
export type ControlPosition = { x: number; y: number };
export type ControlMetrics = { width: number; height: number; padHeight: number; buttonSize: number };

const dimension = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;

export function getControlHeightBudget(bounds: ControlBounds, compact: boolean, landscape = false): number {
  const height = dimension(bounds.height);
  if (height === 0) return 0;
  return compact && !landscape ? Math.floor(height / 2) + 44 : height;
}

export function getControlMetrics(settings: Pick<SnakeControlSettings, 'style' | 'size'>, compact = false, availableHeight?: number): ControlMetrics {
  const buttonSize = { SMALL: 52, LARGE: 64, EXTRA_LARGE: 76 }[settings.size];
  const nominalDiameter = { SMALL: 144, LARGE: 176, EXTRA_LARGE: 208 }[settings.size];
  const diameter = typeof availableHeight === 'number' && Number.isFinite(availableHeight) && availableHeight > 0
    ? Math.max(128, Math.min(nominalDiameter, Math.floor(availableHeight - 44))) : nominalDiameter;
  const width = settings.style === 'ANALOG' ? diameter : buttonSize * 3 + 16;
  const padHeight = settings.style === 'ANALOG' ? width : compact ? buttonSize * 2 + 8 : width;
  return { width, height: padHeight + 44, padHeight, buttonSize };
}

export function getControlOffset(position: ControlPosition, bounds: ControlBounds, metrics: Pick<ControlMetrics, 'width' | 'height'>): ControlPosition {
  return {
    x: unit(position.x) * Math.max(0, dimension(bounds.width) - dimension(metrics.width)),
    y: unit(position.y) * Math.max(0, dimension(bounds.height) - dimension(metrics.height)),
  };
}

export function clampControlOffset(offset: ControlPosition, bounds: ControlBounds, metrics: Pick<ControlMetrics, 'width' | 'height'>): ControlPosition {
  return {
    x: Math.max(0, Math.min(Number.isFinite(offset.x) ? offset.x : 0, Math.max(0, dimension(bounds.width) - dimension(metrics.width)))),
    y: Math.max(0, Math.min(Number.isFinite(offset.y) ? offset.y : 0, Math.max(0, dimension(bounds.height) - dimension(metrics.height)))),
  };
}

export function normalizeControlPosition(
  offset: ControlPosition, bounds: ControlBounds, metrics: Pick<ControlMetrics, 'width' | 'height'>,
  fallback: ControlPosition = { x: 1, y: 1 },
): ControlPosition {
  const clamped = clampControlOffset(offset, bounds, metrics);
  const maxX = Math.max(0, dimension(bounds.width) - dimension(metrics.width));
  const maxY = Math.max(0, dimension(bounds.height) - dimension(metrics.height));
  return { x: maxX > 0 ? clamped.x / maxX : unit(fallback.x), y: maxY > 0 ? clamped.y / maxY : unit(fallback.y) };
}
