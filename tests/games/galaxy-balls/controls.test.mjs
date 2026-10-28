import assert from 'node:assert/strict';
import test from 'node:test';
import { createHoldController, REPEAT_INTERVAL_MS } from '../../../src/games/galaxy-balls/controls/holdController.ts';

function setup() {
  const calls = [];
  const pending = new Map();
  let id = 0;
  const controller = createHoldController((action) => calls.push(action), {
    set(callback, delay) { assert.equal(delay, REPEAT_INTERVAL_MS); pending.set(++id, callback); return id; },
    clear(timer) { pending.delete(timer); },
  });
  const tick = () => { const jobs = [...pending.values()]; pending.clear(); jobs.forEach((job) => job()); };
  return { calls, pending, controller, tick };
}

test('holding repeats one direction and release prevents any later movement', () => {
  const { calls, pending, controller, tick } = setup();
  controller.setEnabled(true);
  controller.start('left');
  tick(); tick();
  assert.deepEqual(calls, ['left', 'left', 'left']);
  controller.stop('left');
  tick();
  assert.equal(calls.length, 3);
  assert.equal(pending.size, 0);
});

test('switching fingers cancels the previous direction without an old release cancelling the new one', () => {
  const { calls, pending, controller, tick } = setup();
  controller.setEnabled(true);
  controller.start('left');
  const staleTick = [...pending.values()][0];
  controller.start('right');
  controller.stop('left');
  staleTick(); tick();
  assert.deepEqual(calls, ['left', 'right', 'right']);
  assert.equal(pending.size, 1);
});

test('pause, game over, background and unmount cancel a hold and never restart it on resume', () => {
  for (const reason of ['pause', 'gameOver', 'background', 'unmount']) {
    const { calls, pending, controller, tick } = setup();
    controller.setEnabled(true);
    controller.start('down');
    const staleTick = [...pending.values()][0];
    controller.setEnabled(false);
    controller.start('left');
    staleTick(); tick();
    controller.setEnabled(true);
    tick();
    assert.deepEqual(calls, ['down'], reason);
    assert.equal(pending.size, 0, reason);
  }
});

test('a game-over callback cannot schedule a fresh repeat while cancelling input', () => {
  const pending = [];
  const controller = createHoldController(() => controller.setEnabled(false), {
    set(callback) { pending.push(callback); return 1; }, clear() {},
  });
  controller.setEnabled(true);
  controller.start('down');
  assert.equal(pending.length, 0);
});
