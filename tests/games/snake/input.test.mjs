import assert from 'node:assert/strict';
import test from 'node:test';

import { getAnalogDirection, getDirectionForKey, getSwipeDirection } from '../../../src/games/snake/controls/input.ts';
import { queueControlDirection } from '../../../src/games/snake/controls/turnIntent.ts';
import { createSnakeGame, pauseSnake, queueDirection, restoreSnakeGame, resumeSnake, stepSnake } from '../../../src/games/snake/engine/snakeEngine.ts';

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

test('analog input has a radial dead zone and four distinct headings', () => {
  assert.equal(getAnalogDirection(0, 0), null);
  assert.equal(getAnalogDirection(11, 0), null);
  assert.equal(getAnalogDirection(7, 7), null);
  assert.equal(getAnalogDirection(12, 0), 'RIGHT');
  assert.equal(getAnalogDirection(-40, 3), 'LEFT');
  assert.equal(getAnalogDirection(3, -40), 'UP');
  assert.equal(getAnalogDirection(3, 40), 'DOWN');
  assert.equal(getAnalogDirection(9, 9), 'RIGHT', 'Outside the circular dead zone');
  assert.equal(getAnalogDirection(0, 0, 'UP', 0), null);
  assert.equal(getAnalogDirection(1, 0, null, 0), 'RIGHT');
  assert.equal(getAnalogDirection(18, 0, null, 20), null);
});

test('a held analog direction resists diagonal jitter but switches decisively at the next sector', () => {
  assert.equal(getAnalogDirection(30, 31, 'RIGHT'), 'RIGHT');
  assert.equal(getAnalogDirection(30, -31, 'RIGHT'), 'RIGHT');
  assert.equal(getAnalogDirection(20, 32, 'RIGHT'), 'DOWN');
  assert.equal(getAnalogDirection(-31, -30, 'UP'), 'UP');
  assert.equal(getAnalogDirection(-32, -20, 'UP'), 'LEFT');
  assert.equal(getAnalogDirection(-30, 31, 'LEFT'), 'LEFT');
  assert.equal(getAnalogDirection(-20, 32, 'LEFT'), 'DOWN');
  assert.equal(getAnalogDirection(31, 30, 'DOWN'), 'DOWN');
  assert.equal(getAnalogDirection(32, 20, 'DOWN'), 'RIGHT');
  assert.equal(getAnalogDirection(-40, 0, 'RIGHT'), 'LEFT');
  assert.equal(getAnalogDirection(0, -40, 'DOWN'), 'UP');
  assert.equal(getAnalogDirection(1, 1, 'UP'), null, 'Returning to center releases the held direction');
});

test('invalid analog samples cannot create or retain a phantom direction', () => {
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.equal(getAnalogDirection(invalid, 30, 'UP'), null);
    assert.equal(getAnalogDirection(30, invalid, 'RIGHT'), null);
    assert.equal(getAnalogDirection(30, 0, 'RIGHT', invalid), null);
  }
  assert.equal(getAnalogDirection(30, 0, 'RIGHT', -1), null);
  assert.equal(getAnalogDirection(30, 0, '__proto__'), 'RIGHT');
});

test('a countdown accepts a first turn while leaving the run and its timers paused', () => {
  const original = createSnakeGame('NORMAL', 123, 'ARCADE');
  const before = structuredClone(original);
  const queued = queueControlDirection(original, 'UP', true);
  assert.equal(queued.status, 'PAUSED');
  assert.deepEqual(queued.turnQueue, ['UP']);
  assert.strictEqual(queued.body, original.body);
  assert.strictEqual(queued.food, original.food);
  assert.equal(queued.score, original.score);
  assert.equal(queued.seed, original.seed);
  assert.equal(queued.comboTicks, original.comboTicks);
  assert.strictEqual(stepSnake(queued), queued);
  assert.deepEqual(original, before);
  const next = stepSnake(resumeSnake(queued));
  assert.equal(next.direction, 'UP');
  assert.deepEqual(next.body[0], { x: original.body[0].x, y: original.body[0].y - 1 });
});

test('ordinary pause and terminal states ignore controls, and a countdown still cannot reverse', () => {
  const original = createSnakeGame('NORMAL', 123);
  assert.strictEqual(queueControlDirection(original, 'UP', false), original);
  assert.strictEqual(queueControlDirection(original, 'LEFT', true), original);
  assert.strictEqual(queueControlDirection(original, 'RIGHT', true), original);
  for (const status of ['GAME_OVER', 'WON']) {
    const terminal = { ...original, status };
    assert.strictEqual(queueControlDirection(terminal, 'UP', true), terminal);
    assert.strictEqual(queueControlDirection(terminal, 'UP', false), terminal);
  }
  const playing = resumeSnake(original);
  assert.deepEqual(queueControlDirection(playing, 'DOWN', false), queueDirection(playing, 'DOWN'));
});

test('new legal intent corrects an outdated second turn instead of being discarded', () => {
  const playing = resumeSnake(createSnakeGame('NORMAL', 42));
  const original = queueDirection(queueDirection(playing, 'UP'), 'LEFT');
  const corrected = queueControlDirection(original, 'RIGHT', false);
  assert.deepEqual(original.turnQueue, ['UP', 'LEFT']);
  assert.deepEqual(corrected.turnQueue, ['UP', 'RIGHT']);
  assert.strictEqual(queueControlDirection(corrected, 'RIGHT', false), corrected);
  assert.strictEqual(queueControlDirection(corrected, 'DOWN', false), corrected, 'The correction cannot reverse the first turn');
  const straight = queueControlDirection(corrected, 'UP', false);
  assert.deepEqual(straight.turnQueue, ['UP'], 'Continuing the first turn cancels an outdated second turn');
  const next = stepSnake(corrected);
  assert.equal(next.direction, 'UP');
  assert.equal(stepSnake(next).direction, 'RIGHT');
});

test('legacy saved turns can be corrected during a countdown in every starting heading', () => {
  const vectors = { UP: { x: 0, y: -1 }, RIGHT: { x: 1, y: 0 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 } };
  const cases = [
    ['RIGHT', 'UP', 'LEFT'], ['DOWN', 'RIGHT', 'UP'],
    ['LEFT', 'DOWN', 'RIGHT'], ['UP', 'LEFT', 'DOWN'],
  ];
  for (const [direction, first, second] of cases) {
    const vector = vectors[direction];
    const game = {
      ...createSnakeGame('FAST', 123), direction, status: 'PLAYING', food: { x: 0, y: 0 },
      body: Array.from({ length: 4 }, (_, index) => ({ x: 9 - vector.x * index, y: 9 - vector.y * index })),
    };
    const queued = queueDirection(queueDirection(game, first), second);
    const legacy = Object.fromEntries(['body', 'direction', 'turnQueue', 'food', 'score', 'difficulty', 'status', 'seed']
      .map(key => [key, structuredClone(queued[key])]));
    const before = structuredClone(legacy);
    const restored = restoreSnakeGame(legacy);
    assert.ok(restored);
    assert.deepEqual(restored.turnQueue, [first, second]);
    const corrected = queueControlDirection(restored, direction, true);
    assert.equal(corrected.status, 'PAUSED');
    assert.deepEqual(corrected.turnQueue, [first, direction]);
    assert.deepEqual(restoreSnakeGame(corrected), corrected);
    assert.deepEqual(legacy, before, 'Correcting input must not change the stored document');
    const next = stepSnake(resumeSnake(corrected));
    assert.equal(next.direction, first);
    assert.equal(next.status, 'PLAYING');
    const following = stepSnake(next);
    assert.equal(following.direction, direction);
    assert.equal(following.status, 'PLAYING');
  }
});

test('rapid input bursts remain bounded, immutable, and safe across the next two moves', () => {
  const directions = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
  for (let burst = 0; burst < 1024; burst++) {
    let value = burst;
    const original = resumeSnake(createSnakeGame('NORMAL', 42));
    const before = structuredClone(original);
    let queued = original;
    for (let index = 0; index < 5; index++) {
      queued = queueControlDirection(queued, directions[value % 4], false);
      value = Math.floor(value / 4);
      assert.ok(queued.turnQueue.length <= 2);
      assert.equal(queued.direction, 'RIGHT');
      assert.deepEqual(queued.body, original.body);
    }
    assert.deepEqual(original, before);
    const first = stepSnake(queued);
    const second = stepSnake(first);
    assert.equal(first.status, 'PLAYING');
    assert.equal(second.status, 'PLAYING');
    assert.notDeepEqual(first.body[0], original.body[1]);
    assert.notDeepEqual(second.body[0], first.body[1]);
    assert.deepEqual(pauseSnake(queued).turnQueue, queued.turnQueue);
  }
});
