import assert from 'node:assert/strict';
import test from 'node:test';

import { createSnakeGame, pauseSnake, resumeSnake, stepSnake } from '../../../src/games/snake/engine/snakeEngine.ts';
import { getSnakePickupReward } from '../../../src/games/snake/presentation/reward.ts';

const playing = (mode = 'CLASSIC') => resumeSnake(createSnakeGame('NORMAL', 42, mode));
const feed = state => stepSnake({ ...state, food: { x: state.body[0].x + 1, y: state.body[0].y } });

test('every berry keeps its pickup sound, including the fifth-berry milestone in both gardens', () => {
  for (const mode of ['CLASSIC', 'ARCADE']) {
    let game = playing(mode);
    for (let berry = 1; berry <= 5; berry++) {
      const next = feed(game);
      const reward = getSnakePickupReward(game, next);
      assert.equal(reward.kind, berry === 5 ? 'level' : 'food');
      assert.deepEqual(reward.sounds, berry === 5 ? ['eat', 'level'] : ['eat']);
      assert.equal(reward.points, mode === 'CLASSIC' ? 10 : Math.min(berry, 3) * 10);
      assert.deepEqual(reward.position, next.body[0]);
      game = next;
    }
  }
});

test('golden fruit plays its own cue without masquerading as a level or normal berry', () => {
  const previous = { ...playing('ARCADE'), food: { x: 0, y: 0 },
    bonus: { position: { x: 10, y: 9 }, ticksLeft: 10 } };
  const next = stepSnake(previous);
  assert.equal(next.body.length, previous.body.length);
  const reward = getSnakePickupReward(previous, next);
  assert.equal(reward.kind, 'bonus');
  assert.equal(reward.points, 50);
  assert.deepEqual(reward.sounds, ['bonus']);
});

test('ordinary motion, collision, pause and reopening do not create pickup rewards', () => {
  const previous = { ...playing(), food: { x: 0, y: 0 } };
  const next = stepSnake(previous);
  assert.equal(getSnakePickupReward(previous, next), null);
  assert.equal(getSnakePickupReward(next, pauseSnake(next)), null);
  assert.equal(getSnakePickupReward(pauseSnake(next), resumeSnake(pauseSnake(next))), null);
  const wall = { ...previous, body: [17, 16, 15, 14].map(x => ({ x, y: 9 })) };
  assert.equal(getSnakePickupReward(wall, stepSnake(wall)), null);
});

test('the final berry keeps its pop and leaves the final fanfare to victory', () => {
  const path = [];
  for (let y = 0; y < 18; y++) {
    for (let i = 0; i < 18; i++) path.push({ x: y % 2 === 0 ? i : 17 - i, y });
  }
  const previous = { ...playing(), body: path.slice(1), direction: 'LEFT', food: { x: 0, y: 0 }, score: 3190 };
  const next = stepSnake(previous);
  assert.equal(next.status, 'WON');
  const reward = getSnakePickupReward(previous, next);
  assert.equal(reward.kind, 'level');
  assert.equal(reward.points, 10);
  assert.deepEqual(reward.sounds, ['eat']);
});

test('burst position stays anchored when the snake moves after a pickup', () => {
  const previous = playing();
  const next = feed(previous);
  const reward = getSnakePickupReward(previous, next);
  const pickup = { ...reward.position };
  next.body[0].x++;
  assert.deepEqual(reward.position, pickup);
});
