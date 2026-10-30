import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultSnakeData, createSnakeDataStore, parseSnakeData, SNAKE_DATA_KEY } from '../../../src/games/snake/data/snakeDataStore.ts';
import { createSnakeGame, getSnakeMaxScore, resumeSnake, stepSnake, SNAKE_DIFFICULTIES, SNAKE_COLS, SNAKE_ROWS } from '../../../src/games/snake/engine/snakeEngine.ts';

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

function playable(difficulty = 'NORMAL', score = 10) {
  const state = createSnakeGame(difficulty, 123456789);
  const tail = state.body.at(-1);
  for (let offset = 1; offset <= score / 10; offset++) state.body.push({ x: tail.x - offset, y: tail.y });
  return { ...state, score, status: 'PLAYING', turnQueue: ['UP', 'LEFT'], food: { x: 14, y: 10 } };
}

const clone = (value) => JSON.parse(JSON.stringify(value));

function arcadePlayable(difficulty = 'NORMAL', foods = 5) {
  let state = resumeSnake(createSnakeGame(difficulty, 123456789, 'ARCADE'));
  for (let index = 0; index < foods; index++) {
    state = stepSnake({ ...state, food: { x: state.body[0].x + 1, y: state.body[0].y } });
  }
  return state;
}

test('Snake initializes without writes, hydrates once and only publishes to subscribed listeners', async () => {
  const storage = memoryStorage();
  const store = createSnakeDataStore(storage);
  assert.deepEqual(store.getSnapshot(), { data: createDefaultSnakeData(), ready: false, saveFailed: false });
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications++; });
  const loading = store.load();
  assert.equal(store.load(), loading);
  await loading;
  await store.flush();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(notifications, 1);
  assert.equal(storage.writes.length, 0);
  unsubscribe();
  store.setDifficulty('FAST');
  await store.flush();
  assert.equal(notifications, 1);
});

test('checkpoints restore paused with their body, food, turn queue, seed and per-pace personal best', async () => {
  for (const difficulty of SNAKE_DIFFICULTIES) {
    const storage = memoryStorage();
    const store = createSnakeDataStore(storage);
    await store.load();
    const state = playable(difficulty, 20);
    const expected = { ...clone(state), status: 'PAUSED' };
    store.saveGame(state);
    assert.equal(state.status, 'PLAYING', 'Saving must not pause the live engine');
    state.body[0].x = 0;
    state.food.x = 0;
    state.turnQueue.length = 0;
    await store.flush();
    const reopened = createSnakeDataStore(storage);
    await reopened.load();
    assert.deepEqual(reopened.getSnapshot().data.currentGame, expected);
    assert.equal(reopened.getSnapshot().data.bestScores[difficulty], 20);
    assert.equal(reopened.getSnapshot().data.lastDifficulty, difficulty);
  }
});

test('personal bests persist during unfinished runs and stay separate for each pace', async () => {
  const storage = memoryStorage();
  const store = createSnakeDataStore(storage);
  await store.load();
  store.saveGame(playable('EASY', 30));
  store.saveGame(playable('NORMAL', 20));
  store.saveGame(playable('FAST', 40));
  store.saveGame(playable('EASY', 10));
  store.setDifficulty('NORMAL');
  await store.flush();
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.bestScores, { EASY: 30, NORMAL: 20, FAST: 40 });
  assert.equal(reopened.getSnapshot().data.currentGame.score, 10);
  assert.equal(reopened.getSnapshot().data.currentGame.difficulty, 'EASY');
  assert.equal(reopened.getSnapshot().data.lastDifficulty, 'NORMAL');
});

test('Snake reads and writes only its own key, preserving Galaxy Balls scores and shared settings verbatim', async () => {
  const legacyKey = '@galaxy-balls/game-data';
  const legacy = '{"version":1,"language":"om","soundsEnabled":false,"highScores":{"CLASSIC":[{"alias":"YOU","score":900}]}}';
  const disk = new Map([[legacyKey, legacy]]);
  const accessedKeys = [];
  const storage = {
    async getItem(key) { accessedKeys.push(key); return disk.get(key) ?? null; },
    async setItem(key, value) { accessedKeys.push(key); disk.set(key, value); },
  };
  assert.notEqual(SNAKE_DATA_KEY, legacyKey);
  const store = createSnakeDataStore(storage);
  await store.load();
  store.setDifficulty('FAST');
  store.saveGame(playable('FAST', 20));
  store.finishGame({ ...playable('FAST', 30), status: 'GAME_OVER' });
  await store.flush();
  assert.ok(accessedKeys.every((key) => key === SNAKE_DATA_KEY));
  assert.equal(disk.get(legacyKey), legacy);
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.equal(reopened.getSnapshot().data.bestScores.FAST, 30);
  assert.equal(reopened.getSnapshot().data.currentGame, null);
});

test('missing, malformed and unsupported payloads use safe defaults', () => {
  for (const raw of [null, '', '{broken', 'null', '[]', '42', '{"version":2}', '{"lastDifficulty":"FAST"}']) {
    assert.deepEqual(parseSnakeData(raw), createDefaultSnakeData());
  }
});

test('corrupt scores and checkpoints do not erase valid pace scores or the selected pace', () => {
  const data = parseSnakeData(JSON.stringify({
    version: 1, lastDifficulty: 'EASY', bestScores: { EASY: -1, NORMAL: '20', FAST: 40 },
    currentGame: { ...playable('NORMAL', 20), body: [] },
  }));
  assert.deepEqual(data.bestScores, { EASY: 0, NORMAL: 0, FAST: 40 });
  assert.equal(data.lastDifficulty, 'EASY');
  assert.equal(data.currentGame, null);
  for (const score of [-1, 1, 1.5, 11, 3210, Number.MAX_SAFE_INTEGER + 1, null, false]) {
    assert.equal(parseSnakeData(JSON.stringify({ version: 1, bestScores: { NORMAL: score } })).bestScores.NORMAL, 0);
  }
  assert.equal(parseSnakeData('{"version":1,"lastDifficulty":"UNKNOWN"}').lastDifficulty, 'NORMAL');
});

test('a valid old playing checkpoint restores paused and recovers its best score without rewriting on load', async () => {
  const state = playable('FAST', 30);
  const storage = memoryStorage(JSON.stringify({ version: 1, lastDifficulty: 'EASY', currentGame: state }));
  const store = createSnakeDataStore(storage);
  await store.load();
  await store.flush();
  assert.deepEqual(store.getSnapshot().data.currentGame, { ...state, status: 'PAUSED' });
  assert.equal(store.getSnapshot().data.bestScores.FAST, 30);
  assert.equal(store.getSnapshot().data.lastDifficulty, 'EASY');
  assert.equal(storage.writes.length, 0);
});

test('delayed hydration ignores early updates and cannot overwrite a saved game with defaults', async () => {
  const saved = { ...createDefaultSnakeData(), lastDifficulty: 'FAST', currentGame: { ...playable('FAST', 20), status: 'PAUSED' }, bestScores: { EASY: 10, NORMAL: 20, FAST: 30 } };
  const storage = memoryStorage();
  let resolveRead;
  let reads = 0;
  storage.getItem = () => { reads++; return new Promise((resolve) => { resolveRead = resolve; }); };
  const store = createSnakeDataStore(storage);
  const loading = store.load();
  assert.equal(store.load(), loading);
  store.setDifficulty('EASY');
  store.saveGame(playable('EASY', 30));
  store.finishGame({ ...playable('EASY', 40), status: 'GAME_OVER' });
  assert.equal(store.getSnapshot().ready, false);
  assert.equal(storage.writes.length, 0);
  resolveRead(JSON.stringify(saved));
  await loading;
  await store.flush();
  assert.equal(reads, 1);
  assert.deepEqual(store.getSnapshot().data, saved);
  assert.equal(storage.writes.length, 0);
});

test('many checkpoints coalesce behind a slow write and finishing atomically saves best score and clears the run', async () => {
  const storage = memoryStorage();
  const setItem = storage.setItem;
  let finishFirst;
  let writesStarted = 0;
  storage.setItem = async (...args) => {
    if (++writesStarted === 1) await new Promise((resolve) => { finishFirst = resolve; });
    await setItem(...args);
  };
  const store = createSnakeDataStore(storage);
  await store.load();
  store.saveGame(playable('NORMAL', 10));
  for (let seed = 1; seed <= 200; seed++) store.saveGame({ ...playable('NORMAL', 20), seed });
  const terminal = { ...playable('NORMAL', 30), status: 'GAME_OVER' };
  const published = [];
  const unsubscribe = store.subscribe(() => published.push(store.getSnapshot().data));
  store.finishGame(terminal);
  store.finishGame(terminal);
  store.saveGame(terminal);
  unsubscribe();
  assert.equal(published.length, 1);
  assert.equal(published[0].currentGame, null);
  assert.equal(published[0].bestScores.NORMAL, 30);
  assert.equal(writesStarted, 1);
  finishFirst();
  await store.flush();
  assert.equal(writesStarted, 2, 'Only the in-flight write and the latest snapshot should persist');
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.equal(reopened.getSnapshot().data.currentGame, null);
  assert.equal(reopened.getSnapshot().data.bestScores.NORMAL, 30);
});

test('only terminal states finish a run; both a loss and a filled board preserve the personal best', async () => {
  const storage = memoryStorage();
  const store = createSnakeDataStore(storage);
  await store.load();
  const state = playable('EASY', 20);
  store.saveGame(state);
  store.finishGame(state);
  store.finishGame({ ...state, status: 'PAUSED' });
  assert.ok(store.getSnapshot().data.currentGame);
  store.finishGame({ ...state, status: 'GAME_OVER' });
  assert.equal(store.getSnapshot().data.currentGame, null);
  assert.equal(store.getSnapshot().data.bestScores.EASY, 20);
  store.saveGame(playable('FAST', 10));
  const body = Array.from({ length: SNAKE_ROWS }, (_, y) => Array.from({ length: SNAKE_COLS }, (_, offset) => ({ x: y % 2 ? SNAKE_COLS - 1 - offset : offset, y }))).flat();
  const won = { ...state, body, direction: 'LEFT', turnQueue: [], food: null, score: (body.length - 4) * 10, difficulty: 'FAST', status: 'WON' };
  store.finishGame(won);
  await store.flush();
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.equal(reopened.getSnapshot().data.currentGame, null);
  assert.equal(reopened.getSnapshot().data.bestScores.EASY, 20);
  assert.equal(reopened.getSnapshot().data.bestScores.FAST, won.score);
});

test('a failed read keeps existing disk data untouched while Snake remains usable in memory', async () => {
  const original = JSON.stringify({ ...createDefaultSnakeData(), currentGame: playable('EASY', 20) });
  const storage = memoryStorage(original);
  storage.getItem = async () => { throw new Error('Storage unavailable'); };
  const store = createSnakeDataStore(storage);
  await store.load();
  store.setDifficulty('FAST');
  store.saveGame(playable('FAST', 30));
  await store.flush();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().saveFailed, true);
  assert.equal(store.getSnapshot().data.bestScores.FAST, 30);
  assert.equal(storage.value, original);
  assert.equal(storage.writes.length, 0);
});

test('failed writes retry the latest checkpoint and selected pace when storage recovers', async () => {
  const storage = memoryStorage();
  const setItem = storage.setItem;
  let unavailable = true;
  storage.setItem = async (...args) => {
    if (unavailable) throw new Error('Storage unavailable');
    await setItem(...args);
  };
  const store = createSnakeDataStore(storage);
  await store.load();
  store.saveGame(playable('NORMAL', 10));
  await store.flush();
  assert.equal(store.getSnapshot().saveFailed, true);
  store.saveGame(playable('FAST', 30));
  store.setDifficulty('EASY');
  await store.flush();
  unavailable = false;
  await store.flush();
  assert.equal(store.getSnapshot().saveFailed, false);
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data, store.getSnapshot().data);
  assert.equal(reopened.getSnapshot().data.currentGame.score, 30);
  assert.equal(reopened.getSnapshot().data.currentGame.difficulty, 'FAST');
  assert.equal(reopened.getSnapshot().data.lastDifficulty, 'EASY');
  assert.deepEqual(reopened.getSnapshot().data.bestScores, { EASY: 0, NORMAL: 10, FAST: 30 });
});

test('the original Snake document migrates as Classic with its run and records intact', async () => {
  const current = playable('EASY', 20);
  const legacyRun = Object.fromEntries(['body', 'direction', 'turnQueue', 'food', 'score', 'difficulty', 'status', 'seed']
    .map(key => [key, clone(current[key])]));
  const storage = memoryStorage(JSON.stringify({
    version: 1, bestScores: { EASY: 40, NORMAL: 70, FAST: 30 }, currentGame: legacyRun, lastDifficulty: 'FAST',
  }));
  const store = createSnakeDataStore(storage);
  await store.load();
  const restored = store.getSnapshot().data;
  assert.equal(restored.lastMode, 'CLASSIC');
  assert.deepEqual(restored.bestScores, { EASY: 40, NORMAL: 70, FAST: 30 });
  assert.deepEqual(restored.arcadeBestScores, { EASY: 0, NORMAL: 0, FAST: 0 });
  assert.deepEqual(restored.currentGame.body, legacyRun.body);
  assert.deepEqual(restored.currentGame.food, legacyRun.food);
  assert.deepEqual(restored.currentGame.turnQueue, legacyRun.turnQueue);
  assert.equal(restored.currentGame.mode, 'CLASSIC');
  assert.equal(restored.currentGame.status, 'PAUSED');
  assert.equal(storage.writes.length, 0, 'Loading a legacy run must not eagerly rewrite it');
  store.setMode('ARCADE');
  await store.flush();
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.bestScores, restored.bestScores);
  assert.equal(reopened.getSnapshot().data.currentGame.mode, 'CLASSIC');
  assert.equal(reopened.getSnapshot().data.lastMode, 'ARCADE');
});

test('Arcade records stay independent from Classic and from other paces during play and after loss', async () => {
  const storage = memoryStorage();
  const store = createSnakeDataStore(storage);
  await store.load();
  assert.equal(store.getSnapshot().data.lastMode, 'ARCADE');
  store.saveGame(playable('NORMAL', 40));
  const normal = arcadePlayable('NORMAL', 5);
  const easy = arcadePlayable('EASY', 4);
  store.saveGame(normal);
  store.finishGame({ ...normal, status: 'GAME_OVER', deathReason: 'wall' });
  store.saveGame(easy);
  store.finishGame({ ...easy, status: 'GAME_OVER', deathReason: 'rock' });
  store.saveGame(arcadePlayable('FAST', 1));
  await store.flush();
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.bestScores, { EASY: 0, NORMAL: 40, FAST: 0 });
  assert.deepEqual(reopened.getSnapshot().data.arcadeBestScores, { EASY: easy.score, NORMAL: normal.score, FAST: 10 });
  assert.equal(reopened.getSnapshot().data.lastMode, 'ARCADE');
  assert.equal(reopened.getSnapshot().data.currentGame.mode, 'ARCADE');
  assert.equal(reopened.getSnapshot().data.currentGame.difficulty, 'FAST');
});

test('an Arcade checkpoint restores rocks, chain and gold lifetime exactly without ticking while paused', async () => {
  const storage = memoryStorage();
  const store = createSnakeDataStore(storage);
  await store.load();
  const state = arcadePlayable('NORMAL', 5);
  assert.ok(state.bonus, 'Five fruit reveal the bonus');
  assert.ok(state.comboTicks > 0);
  assert.equal(state.combo, 3);
  const expected = { ...clone(state), status: 'PAUSED' };
  store.saveGame(state);
  state.bonus.position.x = 0;
  state.bonus.ticksLeft = 1;
  state.rocks[0].x = 0;
  await store.flush();
  const reopened = createSnakeDataStore(storage);
  await reopened.load();
  const saved = reopened.getSnapshot().data.currentGame;
  assert.deepEqual(saved, expected, 'Saved nested objects must not alias the live engine');
  assert.equal(stepSnake(saved), saved, 'An unopened or paused save consumes no bonus or chain time');
  assert.deepEqual(stepSnake(resumeSnake(saved)), stepSnake(resumeSnake(expected)), 'The exact seeded future survives reopening');
});

test('corrupt Arcade records fall back per field and cannot contaminate Classic records', async () => {
  const data = parseSnakeData(JSON.stringify({
    version: 1, bestScores: { EASY: 50, NORMAL: getSnakeMaxScore('ARCADE') },
    arcadeBestScores: { EASY: getSnakeMaxScore('ARCADE'), NORMAL: 11, FAST: -10 }, lastMode: 'UNKNOWN',
  }));
  assert.deepEqual(data.bestScores, { EASY: 50, NORMAL: 0, FAST: 0 });
  assert.deepEqual(data.arcadeBestScores, { EASY: getSnakeMaxScore('ARCADE'), NORMAL: 0, FAST: 0 });
  assert.equal(data.lastMode, 'CLASSIC');
  const storage = memoryStorage();
  const store = createSnakeDataStore(storage);
  await store.load();
  store.setMode('UNKNOWN');
  assert.equal(store.getSnapshot().data.lastMode, 'ARCADE');
  store.finishGame({ ...arcadePlayable(), status: 'GAME_OVER', score: getSnakeMaxScore('ARCADE') + 10 });
  assert.deepEqual(store.getSnapshot().data.arcadeBestScores, { EASY: 0, NORMAL: 0, FAST: 0 });
});
