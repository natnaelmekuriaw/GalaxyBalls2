import assert from 'node:assert/strict';
import test from 'node:test';

import { createOrientationManager } from '../../../src/games/snake/controls/orientation.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(overrides = {}) {
  const calls = [];
  const states = [];
  let policy = 'PREVIOUS_POLICY';
  const manager = createOrientationManager({
    capture: async () => { calls.push(['capture', policy]); return policy; },
    supports: async mode => { calls.push(['supports', mode]); return true; },
    apply: async mode => { calls.push(['apply', mode]); policy = mode; },
    restore: async previous => { calls.push(['restore', previous]); policy = previous; },
    ...overrides,
  });
  const session = manager.createSession(state => states.push(state));
  return { calls, states, manager, session, policy: () => policy };
}

test('entering Snake observes the existing lock without rotating, and leaving an untouched screen does nothing', async () => {
  const { calls, session, manager } = setup();
  session.enter();
  await manager.settled();
  session.leave();
  await manager.settled();
  assert.deepEqual(calls, [['capture', 'PREVIOUS_POLICY']]);
});

test('explicit portrait, landscape and auto choices are local to a visit and restore the prior policy', async () => {
  const { calls, states, policy, session, manager } = setup();
  session.enter();
  for (const mode of ['LANDSCAPE', 'PORTRAIT', 'AUTO']) {
    assert.equal(await session.changeOrientation(mode), true);
    assert.equal(policy(), mode);
    assert.deepEqual(states.at(-1), { requested: mode, busy: false, unavailable: false });
  }
  session.leave();
  await manager.settled();
  assert.deepEqual(calls.at(-1), ['restore', 'PREVIOUS_POLICY']);
  assert.equal(policy(), 'PREVIOUS_POLICY');
});

test('unsupported locks and failed snapshots do not apply a guessed policy', async () => {
  const unsupported = setup({ supports: async () => false });
  unsupported.session.enter();
  assert.equal(await unsupported.session.changeOrientation('LANDSCAPE'), false);
  assert.equal(unsupported.calls.some(([action]) => action === 'apply'), false);
  assert.deepEqual(unsupported.states.at(-1), { requested: 'AUTO', busy: false, unavailable: true });
  unsupported.session.leave();
  await unsupported.manager.settled();

  const unavailable = setup({ capture: async () => { throw new Error('Unavailable'); } });
  unavailable.session.enter();
  assert.equal(await unavailable.session.changeOrientation('LANDSCAPE'), false);
  assert.equal(unavailable.calls.length, 0);
  assert.equal(unavailable.states.at(-1).busy, false);
  assert.equal(unavailable.states.at(-1).unavailable, true);
});

test('leaving during snapshot capture cancels the queued request without touching orientation', async () => {
  const capture = deferred();
  const entered = deferred();
  const { calls, session, manager } = setup({ capture: async () => { entered.resolve(); return capture.promise; } });
  session.enter();
  await entered.promise;
  const request = session.changeOrientation('LANDSCAPE');
  session.leave();
  capture.resolve('PREVIOUS_POLICY');
  assert.equal(await request, false);
  await manager.settled();
  assert.deepEqual(calls, []);
});

test('a late native lock completes before restore, even when another Snake screen enters immediately', async () => {
  const applied = deferred();
  const started = deferred();
  const calls = [];
  let policy = 'PREVIOUS_POLICY';
  const manager = createOrientationManager({
    capture: async () => { calls.push(['capture', policy]); return policy; },
    supports: async () => true,
    apply: async mode => { calls.push(['apply', mode]); started.resolve(); await applied.promise; policy = mode; },
    restore: async previous => { calls.push(['restore', previous]); policy = previous; },
  });
  const firstStates = [];
  const first = manager.createSession(state => firstStates.push(state));
  first.enter();
  const request = first.changeOrientation('LANDSCAPE');
  await started.promise;
  first.leave();
  const statesAtLeave = firstStates.length;
  const second = manager.createSession(() => {});
  second.enter();
  applied.resolve();
  assert.equal(await request, false);
  await manager.settled();
  assert.equal(policy, 'PREVIOUS_POLICY');
  assert.equal(firstStates.length, statesAtLeave, 'No stale UI updates after leaving');
  assert.deepEqual(calls, [
    ['capture', 'PREVIOUS_POLICY'], ['apply', 'LANDSCAPE'],
    ['restore', 'PREVIOUS_POLICY'], ['capture', 'PREVIOUS_POLICY'],
  ]);
  second.leave();
});

test('rapid queued choices keep only the latest unstarted request', async () => {
  const { calls, session, manager } = setup();
  session.enter();
  const old = session.changeOrientation('LANDSCAPE');
  const latest = session.changeOrientation('PORTRAIT');
  assert.equal(await old, false);
  assert.equal(await latest, true);
  assert.deepEqual(calls.filter(([action]) => action === 'apply'), [['apply', 'PORTRAIT']]);
  session.leave();
  await manager.settled();
});

test('a rejecting native lock is still restored and cannot poison the next visit', async () => {
  let fail = true;
  const { calls, session, manager } = setup({ apply: async () => { if (fail) throw new Error('Rejected'); } });
  session.enter();
  assert.equal(await session.changeOrientation('LANDSCAPE'), false);
  session.leave();
  await manager.settled();
  assert.deepEqual(calls.at(-1), ['restore', 'PREVIOUS_POLICY']);
  fail = false;
  session.enter();
  assert.equal(await session.changeOrientation('LANDSCAPE'), true);
  session.leave();
  await manager.settled();
});

test('cleanup failures are contained and requests outside a focused visit are ignored', async () => {
  const { session, manager } = setup({ restore: async () => { throw new Error('Restore unavailable'); } });
  assert.equal(await session.changeOrientation('LANDSCAPE'), false);
  session.enter();
  assert.equal(await session.changeOrientation('LANDSCAPE'), true);
  session.leave();
  await manager.settled();
  assert.equal(await session.changeOrientation('PORTRAIT'), false);
  session.enter();
  assert.equal(await session.changeOrientation('PORTRAIT'), true);
  session.leave();
  await manager.settled();
});
