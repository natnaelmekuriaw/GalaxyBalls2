import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultControlSettings, parseControlSettings } from '../../../src/games/snake/controls/settings.ts';
import { createDefaultSnakeData, createSnakeDataStore, parseSnakeData, SNAKE_DATA_KEY } from '../../../src/games/snake/data/snakeDataStore.ts';
import { createSnakeGame, pauseSnake, resumeSnake, stepSnake } from '../../../src/games/snake/engine/snakeEngine.ts';

const clone = value => JSON.parse(JSON.stringify(value));
function memoryStorage(initial = null) {
  let value = initial;
  const writes = [];
  return {
    writes,
    get value() { return value; },
    async getItem(key) { assert.equal(key, SNAKE_DATA_KEY); return value; },
    async setItem(key, payload) { assert.equal(key, SNAKE_DATA_KEY); writes.push(payload); value = payload; },
  };
}

test('new control defaults are small, locked buttons with independent bottom-right positions', () => {
  const first = createDefaultControlSettings();
  assert.deepEqual(first, { style: 'BUTTONS', size: 'SMALL', locked: true, position: { x: 1, y: 1 } });
  first.position.x = 0;
  first.style = 'ANALOG';
  assert.deepEqual(createDefaultSnakeData().controls, createDefaultControlSettings());
  assert.notDeepEqual(first, createDefaultControlSettings());
});

test('control parsing preserves valid fields and coordinates independently without sharing references', () => {
  const fallback = { style: 'ANALOG', size: 'EXTRA_LARGE', locked: false, position: { x: 0.25, y: 0.8 } };
  const input = { style: 'BROKEN', size: 'LARGE', locked: true, position: { x: 0, y: 7 } };
  const result = parseControlSettings(input, fallback);
  assert.deepEqual(result, { style: 'ANALOG', size: 'LARGE', locked: true, position: { x: 0, y: 0.8 } });
  input.position.x = 1;
  fallback.position.y = 0;
  assert.deepEqual(result.position, { x: 0, y: 0.8 });
  for (const invalid of [NaN, Infinity, -Infinity, -0.01, 1.01, '0.5', null, false]) {
    assert.deepEqual(parseControlSettings({ position: { x: invalid, y: 0.4 } }).position, { x: 1, y: 0.4 });
    assert.deepEqual(parseControlSettings({ position: { x: 0.6, y: invalid } }).position, { x: 0.6, y: 1 });
  }
  assert.deepEqual(parseControlSettings({ position: { x: 1, y: 0 } }).position, { x: 1, y: 0 });
});

test('missing and malformed control data use safe defaults without discarding a valid run or records', () => {
  const currentGame = createSnakeGame('FAST', 51, 'ARCADE');
  for (const controls of [undefined, null, [], 'analog', false, 4,
    { style: 'joystick', size: 'TINY', locked: 'false', position: [] }]) {
    const data = parseSnakeData(JSON.stringify({
      version: 1, currentGame, lastMode: 'ARCADE', lastDifficulty: 'FAST',
      bestScores: { EASY: 70, NORMAL: 20, FAST: 30 }, arcadeBestScores: { EASY: 90, NORMAL: 10, FAST: 100 }, controls,
    }));
    assert.deepEqual(data.controls, createDefaultControlSettings());
    assert.deepEqual(data.currentGame, currentGame);
    assert.deepEqual(data.bestScores, { EASY: 70, NORMAL: 20, FAST: 30 });
    assert.deepEqual(data.arcadeBestScores, { EASY: 90, NORMAL: 10, FAST: 100 });
    assert.equal(data.lastDifficulty, 'FAST');
  }
});

test('older Classic saves gain controls in memory while keeping their exact run and avoiding startup writes', async () => {
  const state = createSnakeGame('EASY', 901, 'CLASSIC');
  const legacy = Object.fromEntries(['body', 'direction', 'turnQueue', 'food', 'score', 'difficulty', 'status', 'seed'].map(key => [key, state[key]]));
  const storage = memoryStorage(JSON.stringify({ version: 1, bestScores: { EASY: 20, NORMAL: 40, FAST: 10 }, currentGame: legacy, lastDifficulty: 'EASY' }));
  const original = storage.value;
  const store = createSnakeDataStore(storage);
  await store.load();
  await store.flush();
  assert.equal(storage.value, original);
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(store.getSnapshot().data.currentGame, state);
  assert.deepEqual(store.getSnapshot().data.controls, createDefaultControlSettings());
  store.setControls({ style: 'ANALOG', position: { x: 0.2, y: 0.6 } });
  await store.flush();
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.currentGame, state);
  assert.deepEqual(reopened.getSnapshot().data.bestScores, { EASY: 20, NORMAL: 40, FAST: 10 });
  assert.equal(reopened.getSnapshot().data.controls.style, 'ANALOG');
});

test('each style, size and lock choice survives reopening together with a checkpoint', async () => {
  for (const style of ['BUTTONS', 'ANALOG']) for (const size of ['SMALL', 'LARGE', 'EXTRA_LARGE']) for (const locked of [false, true]) {
    const storage = memoryStorage();
    const store = createSnakeDataStore(storage);
    await store.load();
    const run = resumeSnake(createSnakeGame('NORMAL', 64, 'ARCADE'));
    store.saveGame(run);
    const controls = { style, size, locked, position: { x: 0.125, y: 0.875 } };
    store.setControls(controls);
    controls.position.x = 1;
    await store.flush();
    const reopened = createSnakeDataStore(storage);
    await reopened.load();
    assert.deepEqual(reopened.getSnapshot().data.controls, { style, size, locked, position: { x: 0.125, y: 0.875 } });
    assert.deepEqual(reopened.getSnapshot().data.currentGame, pauseSnake(run));
    assert.equal(reopened.getSnapshot().data.lastMode, 'ARCADE');
  }
});

test('unchanged or invalid control patches are no-ops and do not create extra writes', async () => {
  const storage = memoryStorage();
  const store = createSnakeDataStore(storage);
  await store.load();
  const initial = store.getSnapshot();
  store.setControls({});
  store.setControls(createDefaultControlSettings());
  store.setControls({ style: 'STICK', size: null, locked: 'false', position: { x: -1, y: Infinity } });
  await store.flush();
  assert.strictEqual(store.getSnapshot(), initial);
  assert.equal(storage.writes.length, 0);
  store.setControls({ size: 'EXTRA_LARGE' });
  await store.flush();
  assert.equal(storage.writes.length, 1);
  assert.equal(store.getSnapshot().data.controls.style, 'BUTTONS');
});

test('control edits during delayed hydration cannot replace saved choices or progress with defaults', async () => {
  const data = createDefaultSnakeData();
  data.controls = { style: 'ANALOG', size: 'EXTRA_LARGE', locked: false, position: { x: 0.3, y: 0.7 } };
  data.currentGame = createSnakeGame('FAST', 11, 'ARCADE');
  const storage = memoryStorage(JSON.stringify(data));
  let resolveRead;
  storage.getItem = () => new Promise(resolve => { resolveRead = resolve; });
  const store = createSnakeDataStore(storage);
  const loading = store.load();
  store.setControls({ style: 'BUTTONS', locked: true, position: { x: 1, y: 1 } });
  assert.equal(storage.writes.length, 0);
  resolveRead(storage.value);
  await loading;
  assert.deepEqual(store.getSnapshot().data, data);
  assert.equal(storage.writes.length, 0);
});

test('slow writes coalesce layout edits and moving checkpoints without losing the newest choices', async () => {
  const storage = memoryStorage();
  const write = storage.setItem;
  let finishFirst, started = 0;
  storage.setItem = async (...args) => {
    if (++started === 1) await new Promise(resolve => { finishFirst = resolve; });
    await write(...args);
  };
  const store = createSnakeDataStore(storage);
  await store.load();
  let run = resumeSnake(createSnakeGame('NORMAL', 17, 'ARCADE'));
  store.saveGame(run);
  const initialCheckpoint = clone(store.getSnapshot().data.currentGame);
  for (let index = 1; index <= 20; index++) {
    store.setControls({ position: { x: index / 20, y: 1 - index / 20 } });
    if (index <= 4) { run = stepSnake(run); store.saveGame(run); }
  }
  store.setControls({ style: 'ANALOG', size: 'EXTRA_LARGE', locked: false });
  assert.notDeepEqual(store.getSnapshot().data.currentGame, initialCheckpoint);
  finishFirst();
  await store.flush();
  assert.equal(storage.writes.length, 2, 'Only the in-flight document and newest complete snapshot need writing');
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.controls, { style: 'ANALOG', size: 'EXTRA_LARGE', locked: false, position: { x: 1, y: 0 } });
  assert.deepEqual(reopened.getSnapshot().data.currentGame, pauseSnake(run));
});

test('a failed read preserves disk data while allowing control changes in memory', async () => {
  const original = JSON.stringify({ ...createDefaultSnakeData(), currentGame: createSnakeGame('FAST', 72) });
  const storage = memoryStorage(original);
  storage.getItem = async () => { throw new Error('Unavailable'); };
  const store = createSnakeDataStore(storage);
  await store.load();
  store.setControls({ style: 'ANALOG', locked: false });
  await store.flush();
  assert.equal(store.getSnapshot().data.controls.style, 'ANALOG');
  assert.equal(store.getSnapshot().saveFailed, true);
  assert.equal(storage.value, original);
  assert.equal(storage.writes.length, 0);
});

test('a failed write retries the newest complete layout and game after storage recovers', async () => {
  const storage = memoryStorage();
  const write = storage.setItem;
  let unavailable = true;
  storage.setItem = async (...args) => { if (unavailable) throw new Error('Unavailable'); await write(...args); };
  const store = createSnakeDataStore(storage);
  await store.load();
  store.setControls({ style: 'ANALOG', locked: false });
  await store.flush();
  assert.equal(store.getSnapshot().saveFailed, true);
  const run = createSnakeGame('EASY', 31, 'ARCADE');
  store.saveGame(run);
  store.setControls({ size: 'EXTRA_LARGE', position: { x: 0.6, y: 0.4 }, locked: true });
  await store.flush();
  unavailable = false;
  await store.flush();
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.equal(store.getSnapshot().saveFailed, false);
  assert.deepEqual(reopened.getSnapshot().data.controls, { style: 'ANALOG', size: 'EXTRA_LARGE', locked: true, position: { x: 0.6, y: 0.4 } });
  assert.deepEqual(reopened.getSnapshot().data.currentGame, run);
});
