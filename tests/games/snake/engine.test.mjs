import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SNAKE_COLS, SNAKE_ROWS, SNAKE_DIFFICULTIES,
  createSnakeGame, getSnakeTickMs, pauseSnake, queueDirection,
  restoreSnakeGame, resumeSnake, stepSnake,
} from '../../../src/games/snake/engine/snakeEngine.ts';

const clone = (value) => JSON.parse(JSON.stringify(value));
const playing = (difficulty = 'NORMAL') => resumeSnake(createSnakeGame(difficulty, 42));

test('a new game waits for the player and places deterministic food outside its four-cell body', () => {
  const first = createSnakeGame('NORMAL', 1234);
  assert.equal(first.status, 'PAUSED');
  assert.equal(first.body.length, 4);
  assert.equal(first.score, 0);
  assert.equal(first.direction, 'RIGHT');
  assert.deepEqual(first.turnQueue, []);
  assert.ok(first.food.x >= 0 && first.food.x < SNAKE_COLS && first.food.y >= 0 && first.food.y < SNAKE_ROWS);
  assert.ok(!first.body.some((point) => point.x === first.food.x && point.y === first.food.y));
  assert.deepEqual(first, createSnakeGame('NORMAL', 1234));
  assert.notDeepEqual(first.food, createSnakeGame('NORMAL', 987654321).food);
});

test('an ordinary move keeps length and score while advancing exactly one cell', () => {
  const state = { ...playing(), food: { x: 0, y: 0 } };
  const before = clone(state);
  const next = stepSnake(state);
  assert.deepEqual(next.body[0], { x: state.body[0].x + 1, y: state.body[0].y });
  assert.deepEqual(next.body.slice(1), state.body.slice(0, -1));
  assert.equal(next.body.length, state.body.length);
  assert.equal(next.score, 0);
  assert.equal(next.seed, state.seed);
  assert.deepEqual(next.food, state.food);
  assert.deepEqual(state, before);
});

test('eating grows once, earns ten points, and advances food randomness without body overlap', () => {
  const state = playing();
  state.food = { x: state.body[0].x + 1, y: state.body[0].y };
  const next = stepSnake(state);
  assert.equal(next.body.length, 5);
  assert.equal(next.score, 10);
  assert.deepEqual(next.body[0], state.food);
  assert.equal(next.seed, (Math.imul(state.seed, 1664525) + 1013904223) >>> 0);
  assert.ok(!next.body.some((point) => point.x === next.food.x && point.y === next.food.y));
  assert.equal(next.status, 'PLAYING');
});

test('rapid direction changes buffer at most two real turns and never reverse the neck', () => {
  const state = playing();
  assert.strictEqual(queueDirection(state, 'LEFT'), state);
  assert.strictEqual(queueDirection(state, 'RIGHT'), state);
  const up = queueDirection(state, 'UP');
  assert.strictEqual(queueDirection(up, 'UP'), up);
  assert.strictEqual(queueDirection(up, 'DOWN'), up);
  const turns = queueDirection(up, 'LEFT');
  assert.deepEqual(turns.turnQueue, ['UP', 'LEFT']);
  assert.strictEqual(queueDirection(turns, 'DOWN'), turns);
  const first = stepSnake(turns);
  assert.equal(first.direction, 'UP');
  assert.deepEqual(first.body[0], { x: state.body[0].x, y: state.body[0].y - 1 });
  assert.deepEqual(first.turnQueue, ['LEFT']);
  const second = stepSnake(first);
  assert.equal(second.direction, 'LEFT');
  assert.deepEqual(second.body[0], { x: state.body[0].x - 1, y: state.body[0].y - 1 });
  assert.equal(second.status, 'PLAYING');
});

test('pause freezes movement and direction input; terminal games cannot restart through resume', () => {
  const queued = queueDirection(playing(), 'UP');
  const paused = pauseSnake(queued);
  assert.equal(paused.status, 'PAUSED');
  assert.deepEqual(paused.turnQueue, ['UP']);
  assert.strictEqual(stepSnake(paused), paused);
  assert.strictEqual(queueDirection(paused, 'LEFT'), paused);
  assert.deepEqual(resumeSnake(paused), queued);
  assert.strictEqual(pauseSnake(paused), paused);
  for (const status of ['GAME_OVER', 'WON']) {
    const terminal = { ...queued, status };
    assert.strictEqual(resumeSnake(terminal), terminal);
    assert.strictEqual(pauseSnake(terminal), terminal);
    assert.strictEqual(stepSnake(terminal), terminal);
    assert.strictEqual(queueDirection(terminal, 'LEFT'), terminal);
  }
});

test('hitting each wall ends the run without moving the body outside the board', () => {
  const cases = [
    { direction: 'RIGHT', body: [17, 16, 15, 14].map((x) => ({ x, y: 5 })) },
    { direction: 'LEFT', body: [0, 1, 2, 3].map((x) => ({ x, y: 5 })) },
    { direction: 'UP', body: [0, 1, 2, 3].map((y) => ({ x: 5, y })) },
    { direction: 'DOWN', body: [17, 16, 15, 14].map((y) => ({ x: 5, y })) },
  ];
  for (const setup of cases) {
    const state = { ...playing(), ...setup, food: { x: 0, y: 10 } };
    const next = stepSnake(state);
    assert.equal(next.status, 'GAME_OVER', setup.direction);
    assert.deepEqual(next.body, state.body);
    assert.deepEqual(next.turnQueue, []);
    assert.equal(next.score, state.score);
  }
});

test('the neck and internal body block the head, but the vacating tail cell is safe', () => {
  const state = {
    ...playing(), direction: 'UP', food: { x: 0, y: 0 },
    body: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }],
  };
  const next = stepSnake(queueDirection(state, 'RIGHT'));
  assert.equal(next.status, 'PLAYING');
  assert.deepEqual(next.body, [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }]);
  const longer = {
    ...state, score: 20,
    body: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 2, y: 1 }],
  };
  const collision = stepSnake(queueDirection(longer, 'RIGHT'));
  assert.equal(collision.status, 'GAME_OVER');
  assert.deepEqual(collision.body, longer.body);
  assert.equal(collision.score, 20);
});

test('near-full boards choose the final free cell and filling the board wins without a food loop', () => {
  const path = [];
  for (let y = 0; y < SNAKE_ROWS; y++) {
    for (let index = 0; index < SNAKE_COLS; index++) {
      path.push({ x: y % 2 === 0 ? index : SNAKE_COLS - 1 - index, y });
    }
  }
  const state = {
    ...playing(), body: path.slice(2), direction: 'LEFT', food: { x: 1, y: 0 },
    score: (SNAKE_COLS * SNAKE_ROWS - 6) * 10,
  };
  const almost = stepSnake(state);
  assert.equal(almost.status, 'PLAYING');
  assert.equal(almost.body.length, SNAKE_COLS * SNAKE_ROWS - 1);
  assert.deepEqual(almost.food, { x: 0, y: 0 });
  const won = stepSnake(almost);
  assert.equal(won.status, 'WON');
  assert.equal(won.body.length, SNAKE_COLS * SNAKE_ROWS);
  assert.equal(won.score, (SNAKE_COLS * SNAKE_ROWS - 4) * 10);
  assert.equal(won.food, null);
  assert.equal(won.seed, almost.seed);
});

test('all paces accelerate after each five foods and stop at a playable minimum interval', () => {
  for (const [difficulty, initial] of [['EASY', 220], ['NORMAL', 160], ['FAST', 110]]) {
    const state = createSnakeGame(difficulty, 42);
    assert.equal(getSnakeTickMs(state), initial);
    assert.equal(getSnakeTickMs({ ...state, score: 40 }), initial);
    assert.equal(getSnakeTickMs({ ...state, score: 50 }), initial - 12);
    assert.equal(getSnakeTickMs({ ...state, score: 100 }), initial - 24);
    assert.equal(getSnakeTickMs({ ...state, score: 3200 }), 65);
  }
  assert.deepEqual(SNAKE_DIFFICULTIES, ['EASY', 'NORMAL', 'FAST']);
});

test('restored runs stay paused and reproduce the exact body, queue, score, food and random future', () => {
  const state = playing('FAST');
  state.food = { x: state.body[0].x, y: state.body[0].y - 1 };
  const queued = queueDirection(queueDirection(state, 'UP'), 'LEFT');
  const raw = clone(queued);
  const restored = restoreSnakeGame(raw);
  assert.deepEqual(restored, { ...raw, status: 'PAUSED' });
  assert.deepEqual(stepSnake(resumeSnake(restored)), stepSnake(queued));
  restored.body[0].x = 0;
  restored.food.x = 0;
  restored.turnQueue.pop();
  assert.deepEqual(raw, queued, 'Restoring must not share mutable points or the turn queue');
});

test('checkpoint validation rejects malformed geometry, scores, food, queues and terminal games', () => {
  const state = playing();
  const invalid = [
    null, [], {}, 'saved',
    { ...state, body: state.body.slice(0, 3) },
    { ...state, body: [{ x: -1, y: 2 }, ...state.body.slice(1)] },
    { ...state, body: [{ x: 18, y: 2 }, ...state.body.slice(1)] },
    { ...state, body: [{ x: 1.5, y: 2 }, ...state.body.slice(1)] },
    { ...state, body: [null, ...state.body.slice(1)] },
    { ...state, body: [state.body[0], state.body[0], ...state.body.slice(2)] },
    { ...state, body: [state.body[0], { x: 0, y: 0 }, ...state.body.slice(2)] },
    { ...state, direction: 'LEFT' },
    { ...state, direction: 'DIAGONAL' },
    { ...state, food: state.body[0] },
    { ...state, food: null },
    { ...state, food: { x: 18, y: 1 } },
    { ...state, food: { x: 0, y: NaN } },
    { ...state, score: 10 },
    { ...state, score: -10 },
    { ...state, score: 0.5 },
    { ...state, difficulty: 'IMPOSSIBLE' },
    { ...state, seed: -1 },
    { ...state, seed: 4294967296 },
    { ...state, seed: 1.5 },
    { ...state, seed: NaN },
    { ...state, turnQueue: ['LEFT'] },
    { ...state, turnQueue: ['RIGHT'] },
    { ...state, turnQueue: ['UP', 'DOWN'] },
    { ...state, turnQueue: ['UP', 'UP'] },
    { ...state, turnQueue: ['UP', 'LEFT', 'DOWN'] },
    { ...state, turnQueue: ['INVALID'] },
    { ...state, status: 'GAME_OVER' },
    { ...state, status: 'WON' },
    { ...state, status: 'READY' },
  ];
  invalid.forEach((value, index) => assert.equal(restoreSnakeGame(value), null, `Invalid checkpoint ${index}`));
});

test('engine operations accept frozen snapshots without changing their nested values', () => {
  const state = playing();
  state.body.forEach(Object.freeze);
  Object.freeze(state.body);
  Object.freeze(state.food);
  Object.freeze(state.turnQueue);
  Object.freeze(state);
  const queued = queueDirection(state, 'UP');
  assert.deepEqual(state.turnQueue, []);
  assert.equal(stepSnake(queued).status, 'PLAYING');
  assert.equal(pauseSnake(state).status, 'PAUSED');
});
