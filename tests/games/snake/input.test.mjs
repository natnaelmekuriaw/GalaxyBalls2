import assert from 'node:assert/strict';
import test from 'node:test';

import { getDirectionForKey, getSwipeDirection } from '../../../src/games/snake/controls/input.ts';

test('Arrow and WASD keys map to their headings regardless of letter case', () => {
  const directions = {
    UP: ['ArrowUp', 'arrowup', 'ARROWUP', 'w', 'W'],
    DOWN: ['ArrowDown', 'arrowdown', 'ARROWDOWN', 's', 'S'],
    LEFT: ['ArrowLeft', 'arrowleft', 'ARROWLEFT', 'a', 'A'],
    RIGHT: ['ArrowRight', 'arrowright', 'ARROWRIGHT', 'd', 'D'],
  };
  for (const [direction, keys] of Object.entries(directions)) {
    for (const key of keys) assert.equal(getDirectionForKey(key), direction, key);
  }
});

test('unrelated keys stay available to pause, navigation, and browser shortcuts', () => {
  for (const key of ['', ' ', 'Escape', 'Enter', 'Tab', 'Control', 'Shift', 'x', 'KeyW', ' w ', '__proto__', 'constructor']) {
    assert.equal(getDirectionForKey(key), null, key);
  }
});

test('a swipe follows its dominant axis and resolves equal diagonals consistently', () => {
  assert.equal(getSwipeDirection(40, 3), 'RIGHT');
  assert.equal(getSwipeDirection(-40, 3), 'LEFT');
  assert.equal(getSwipeDirection(3, 40), 'DOWN');
  assert.equal(getSwipeDirection(3, -40), 'UP');
  assert.equal(getSwipeDirection(16, 16), 'RIGHT');
  assert.equal(getSwipeDirection(-16, -16), 'LEFT');
  assert.equal(getSwipeDirection(16, -17), 'UP');
});

test('small gestures and taps do not turn; exact and custom thresholds are honored', () => {
  for (const [dx, dy] of [[0, 0], [15, 0], [0, -15], [15, 15], [-0.1, 0.1]]) {
    assert.equal(getSwipeDirection(dx, dy), null);
  }
  assert.equal(getSwipeDirection(16, 0), 'RIGHT');
  assert.equal(getSwipeDirection(0, -16), 'UP');
  assert.equal(getSwipeDirection(23, 0, 24), null);
  assert.equal(getSwipeDirection(24, 0, 24), 'RIGHT');
  assert.equal(getSwipeDirection(0, 0, 0), null);
  assert.equal(getSwipeDirection(1, 0, 0), 'RIGHT');
});

test('nonfinite coordinates and invalid thresholds cannot create a phantom swipe', () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.equal(getSwipeDirection(invalid, 30), null);
    assert.equal(getSwipeDirection(30, invalid), null);
    assert.equal(getSwipeDirection(30, 0, invalid), null);
  }
  assert.equal(getSwipeDirection(30, 0, -1), null);
});
