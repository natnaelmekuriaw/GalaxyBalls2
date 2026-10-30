import assert from 'node:assert/strict';
import test from 'node:test';

import { createSnakeCountdown } from '../../../src/games/snake/controls/countdown.ts';
import { createSnakeGame, pauseSnake, resumeSnake, stepSnake } from '../../../src/games/snake/engine/snakeEngine.ts';

function fakeClock() {
  const timers = [];
  return {
    timers,
    schedule(callback, delay) {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return () => { timer.cancelled = true; };
    },
  };
}

test('the countdown completes once after three visible steps and then starts movement', () => {
  const clock = fakeClock();
  const countdown = createSnakeCountdown(clock.schedule);
  const steps = [];
  let game = createSnakeGame('EASY', 12);
  let completions = 0;
  countdown.start(value => steps.push(value), () => { completions++; game = resumeSnake(game); });
  assert.deepEqual(steps, [3]);
  assert.equal(stepSnake(game), game);
  clock.timers[0].callback();
  clock.timers[1].callback();
  assert.deepEqual(steps, [3, 2, 1]);
  assert.equal(stepSnake(game), game);
  clock.timers[2].callback();
  clock.timers[2].callback();
  assert.equal(completions, 1);
  assert.equal(game.status, 'PLAYING');
  assert.notDeepEqual(stepSnake(game).body, game.body);
  assert.ok(clock.timers.every(timer => timer.delay === 700));
});

test('pausing just before completion prevents an already-queued callback from resuming the run', () => {
  const clock = fakeClock();
  const countdown = createSnakeCountdown(clock.schedule);
  let game = createSnakeGame('NORMAL', 12);
  countdown.start(() => {}, () => { game = resumeSnake(game); });
  clock.timers[0].callback();
  clock.timers[1].callback();
  const queuedCompletion = clock.timers[2];
  countdown.cancel();
  game = pauseSnake(game);
  assert.equal(queuedCompletion.cancelled, true);
  queuedCompletion.callback();
  assert.equal(game.status, 'PAUSED');
  assert.equal(stepSnake(game), game);
  assert.equal(clock.timers.length, 3);
});

test('restarting discards old callbacks without shortening or completing the new countdown', () => {
  const clock = fakeClock();
  const countdown = createSnakeCountdown(clock.schedule);
  const steps = [];
  let oldCompletions = 0;
  let newCompletions = 0;
  countdown.start(value => steps.push(`old:${value}`), () => { oldCompletions++; });
  clock.timers[0].callback();
  const stale = clock.timers[1];
  countdown.start(value => steps.push(`new:${value}`), () => { newCompletions++; });
  stale.callback();
  assert.equal(stale.cancelled, true);
  assert.deepEqual(steps, ['old:3', 'old:2', 'new:3']);
  clock.timers[2].callback();
  clock.timers[3].callback();
  clock.timers[4].callback();
  assert.equal(oldCompletions, 0);
  assert.equal(newCompletions, 1);
  assert.deepEqual(steps, ['old:3', 'old:2', 'new:3', 'new:2', 'new:1']);
});

test('cancelling during a visible step cannot schedule another timer', () => {
  const clock = fakeClock();
  const countdown = createSnakeCountdown(clock.schedule);
  let completed = false;
  countdown.start(() => countdown.cancel(), () => { completed = true; });
  assert.equal(clock.timers.length, 0);
  assert.equal(completed, false);
});
