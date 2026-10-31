import assert from 'node:assert/strict';
import test from 'node:test';
import { getControlHeightBudget, getControlMetrics, getControlOffset, clampControlOffset, normalizeControlPosition } from '../../../src/games/snake/controls/layout.ts';

test('a short portrait keeps a usable board alongside a comfortable stick', () => {
  const bounds = { width: 292, height: 330 };
  const budget = getControlHeightBudget(bounds, true, false);
  const stick = getControlMetrics({ style: 'ANALOG', size: 'EXTRA_LARGE' }, true, budget);
  assert.ok(stick.width >= 128, 'The thumb target remains comfortably larger than a standard touch target');
  assert.ok(bounds.height - stick.padHeight - 20 >= 140, 'A large stick should not reduce the board to a tiny preview');
  assert.equal(getControlHeightBudget(bounds, true, true), bounds.height, 'Landscape uses its separate board and control columns');
  assert.equal(getControlHeightBudget(bounds, false, false), bounds.height);
  assert.equal(getControlHeightBudget({ width: 0, height: 0 }, true), 0);
  assert.equal(getControlMetrics({ style: 'BUTTONS', size: 'EXTRA_LARGE' }, true, budget).buttonSize, 76);
});

test('large targets and compact layouts fit a small phone without shrinking the buttons', () => {
  for (const size of ['LARGE', 'EXTRA_LARGE']) {
    const normal = getControlMetrics({ style: 'BUTTONS', size });
    const compact = getControlMetrics({ style: 'BUTTONS', size }, true);
    assert.equal(normal.buttonSize, size === 'LARGE' ? 64 : 76);
    assert.equal(compact.buttonSize, normal.buttonSize);
    assert.ok(normal.width <= 292);
    assert.equal(normal.height, normal.padHeight + 44);
    assert.equal(compact.height, compact.padHeight + 44);
    assert.ok(compact.height < normal.height);
  }
  assert.equal(getControlMetrics({ style: 'ANALOG', size: 'LARGE' }).width, 176);
  assert.equal(getControlMetrics({ style: 'ANALOG', size: 'EXTRA_LARGE' }).width, 208);
});

test('the default dock stays at the bottom right, leaving its handle inside the safe bounds', () => {
  const metrics = getControlMetrics({ style: 'BUTTONS', size: 'LARGE' });
  const bounds = { width: 362, height: 620 };
  const offset = getControlOffset({ x: 1, y: 1 }, bounds, metrics);
  assert.equal(offset.x + metrics.width, bounds.width);
  assert.equal(offset.y + metrics.height, bounds.height);
  assert.ok(offset.y >= 0);
});

test('analog sizes adapt to a short landscape while buttons retain their selected touch size', () => {
  for (const size of ['LARGE', 'EXTRA_LARGE']) {
    const metrics = getControlMetrics({ style: 'ANALOG', size }, true, 218);
    assert.equal(metrics.width, 174);
    assert.equal(metrics.height, 218);
    assert.ok(metrics.width >= 128);
    assert.deepEqual(getControlMetrics({ style: 'BUTTONS', size }, true, 218), getControlMetrics({ style: 'BUTTONS', size }, true));
    const nominal = getControlMetrics({ style: 'ANALOG', size });
    for (const unmeasured of [0, undefined, NaN, Infinity, -5]) {
      assert.deepEqual(getControlMetrics({ style: 'ANALOG', size }, true, unmeasured), nominal);
    }
  }
});

test('dragging clamps all four edges and normalizes positions that survive resizing and changing style', () => {
  const bounds = { width: 362, height: 620 };
  const metrics = getControlMetrics({ style: 'BUTTONS', size: 'LARGE' });
  const clamped = clampControlOffset({ x: -100, y: 9999 }, bounds, metrics);
  assert.deepEqual(clamped, { x: 0, y: bounds.height - metrics.height });
  assert.deepEqual(normalizeControlPosition(clamped, bounds, metrics), { x: 0, y: 1 });
  for (const style of ['BUTTONS', 'ANALOG']) {
    for (const size of ['LARGE', 'EXTRA_LARGE']) {
      const nextMetrics = getControlMetrics({ style, size }, true);
      const nextBounds = { width: 292, height: 320 };
      const normalized = { x: 0.31, y: 0.74 };
      const nextOffset = getControlOffset(normalized, nextBounds, nextMetrics);
      assert.ok(nextOffset.x >= 0 && nextOffset.y >= 0);
      assert.ok(nextOffset.x + nextMetrics.width <= nextBounds.width);
      assert.ok(nextOffset.y + nextMetrics.height <= nextBounds.height);
      const restored = normalizeControlPosition(nextOffset, nextBounds, nextMetrics);
      assert.ok(Math.abs(restored.x - normalized.x) < 0.000001);
      assert.ok(Math.abs(restored.y - normalized.y) < 0.000001);
    }
  }
});

test('zero travel preserves a saved coordinate for a later orientation instead of erasing it', () => {
  const metrics = { width: 244, height: 300 };
  const bounds = { width: 200, height: 200 };
  const saved = { x: 0.2, y: 0.8 };
  assert.deepEqual(getControlOffset(saved, bounds, metrics), { x: 0, y: 0 });
  assert.deepEqual(normalizeControlPosition({ x: 100, y: -100 }, bounds, metrics, saved), saved);
});

test('malformed measurements cannot create an off-screen or nonfinite transform', () => {
  for (const invalid of [NaN, Infinity, -Infinity, -10]) {
    const bounds = { width: invalid, height: invalid };
    const metrics = { width: 200, height: 250 };
    assert.deepEqual(getControlOffset({ x: invalid, y: invalid }, bounds, metrics), { x: 0, y: 0 });
    assert.deepEqual(clampControlOffset({ x: invalid, y: invalid }, bounds, metrics), { x: 0, y: 0 });
  }
});
