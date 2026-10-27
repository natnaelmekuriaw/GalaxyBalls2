import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultGameData, createGameDataStore, GAME_DATA_KEY, parseGameData } from '../src/data/gameDataStore.ts';
import { createNewGameState, lockActivePieceAndResolve } from '../src/engine/galaxyEngine.ts';

function memoryStorage(initial = null) {
  let value = initial;
  const calls = [];
  return {
    calls,
    get value() { return value; },
    async getItem(key) { assert.equal(key, GAME_DATA_KEY); return value; },
    async setItem(key, next) { assert.equal(key, GAME_DATA_KEY); calls.push(next); value = next; },
  };
}

const entry = (score, level = 1) => ({ alias: 'YOU', score, level, date: '2026-10-26' });

test('a fresh install uses the existing defaults without writing during startup', async () => {
  const storage = memoryStorage();
  const store = createGameDataStore(storage);
  assert.equal(store.getSnapshot().ready, false);
  await store.load();
  assert.equal(store.getSnapshot().ready, true);
  assert.deepEqual(store.getSnapshot().data, createDefaultGameData());
  await store.flush();
  assert.equal(storage.calls.length, 0);
});

test('every language and both audio preferences survive closing and reopening the store', async () => {
  for (const language of ['en', 'am', 'om']) for (const sounds of [true, false]) for (const music of [true, false]) {
    const storage = memoryStorage();
    const store = createGameDataStore(storage);
    await store.load();
    store.setLanguage(language);
    store.setSoundsEnabled(sounds);
    store.setMenuMusicEnabled(music);
    store.recordHighScore('CLASSIC', 456, 3, '2026-10-26');
    store.recordHighScore('COMFORT', 789, 5, '2026-10-26');
    await store.flush();
    const reopened = createGameDataStore(storage);
    await reopened.load();
    assert.deepEqual(reopened.getSnapshot().data, store.getSnapshot().data);
    assert.equal(reopened.getSnapshot().data.language, language);
    assert.equal(reopened.getSnapshot().data.soundsEnabled, sounds);
    assert.equal(reopened.getSnapshot().data.menuMusicEnabled, music);
    assert.deepEqual(reopened.getSnapshot().data.highScores.CLASSIC[0], entry(456, 3));
    assert.deepEqual(reopened.getSnapshot().data.highScores.COMFORT[0], entry(789, 5));
  }
});

test('missing, malformed and unsupported saves fall back without throwing', () => {
  for (const raw of [null, '', '{broken', 'null', '[]', '42', '{"version":2}', '{"language":"om"}']) {
    assert.deepEqual(parseGameData(raw), createDefaultGameData());
  }
});

test('bad fields fall back individually while valid language, mute and score data are preserved', () => {
  const saved = { version: 1, language: 'om', soundsEnabled: false, menuMusicEnabled: 'false', highScores: { CLASSIC: [entry(300)], COMFORT: null } };
  const restored = parseGameData(JSON.stringify(saved));
  assert.equal(restored.language, 'om');
  assert.equal(restored.soundsEnabled, false);
  assert.equal(restored.menuMusicEnabled, true);
  assert.deepEqual(restored.highScores.CLASSIC, [entry(300)]);
  assert.deepEqual(restored.highScores.COMFORT, createDefaultGameData().highScores.COMFORT);
  assert.equal(parseGameData('{"version":1,"language":"unknown","soundsEnabled":0}').language, 'en');
  assert.equal(parseGameData('{"version":1,"soundsEnabled":"false"}').soundsEnabled, true);
});

test('restored scores discard invalid entries, sort descending and keep only five per mode', () => {
  const invalid = [null, {}, { ...entry(10), alias: '' }, { ...entry(10), alias: 'X'.repeat(17) },
    entry(-1), entry(1.5), entry(Number.MAX_SAFE_INTEGER + 1), entry(10, 0),
    { ...entry(10), date: '2026-02-30' }, { ...entry(10), date: 'nonsense' }];
  const data = parseGameData(JSON.stringify({ version: 1, highScores: {
    CLASSIC: [...invalid, ...[10, 600, 70, 400, 200, 900, 300].map((score) => entry(score))],
    COMFORT: [], PRACTICE: [entry(999)],
  } }));
  assert.deepEqual(data.highScores.CLASSIC.map(({ score }) => score), [900, 600, 400, 300, 200]);
  assert.deepEqual(data.highScores.COMFORT, []);
  assert.deepEqual(data.highScores.PRACTICE, []);
});

test('completed runs retain separate top-five tables across relaunches', async () => {
  const storage = memoryStorage();
  const store = createGameDataStore(storage);
  await store.load();
  for (const score of [50, 250, 120, 300, 150, 400]) store.recordHighScore('CLASSIC', score, 2, '2026-10-26');
  store.recordHighScore('COMFORT', 1000, 7, '2026-10-26');
  store.recordHighScore('PRACTICE', 9999, 8, '2026-10-26');
  store.recordHighScore('CLASSIC', 0, 1, '2026-10-26');
  store.recordHighScore('CLASSIC', -4, 1, '2026-10-26');
  await store.flush();
  const reopened = createGameDataStore(storage);
  await reopened.load();
  const scores = reopened.getSnapshot().data.highScores;
  assert.deepEqual(scores.CLASSIC.map(({ score }) => score), [400, 300, 250, 150, 120]);
  assert.equal(scores.COMFORT[0].score, 1000);
  assert.deepEqual(scores.PRACTICE, []);
});

test('a real game-over result can be recorded and restored', async () => {
  const state = createNewGameState('COMFORT', {}, 123);
  state.score = 270;
  state.level = 2;
  for (const row of state.grid) for (const col of [2, 3, 4]) row[col] = { kind: 'STONE' };
  state.activePiece = { x: 0, y: 9, cells: [{ dx: 0, dy: 0, kind: 'NORMAL', colorId: 1 }], isSingleSpecial: false };
  const summary = lockActivePieceAndResolve(state);
  assert.equal(summary.gameOver, true);
  const storage = memoryStorage();
  const store = createGameDataStore(storage);
  await store.load();
  store.recordHighScore(state.config.mode, state.score, state.level, '2026-10-26');
  await store.flush();
  const reopened = createGameDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.highScores.COMFORT[0], entry(state.score, state.level));
});

test('hydration is single-flight and defaults cannot overwrite a delayed saved mute or language', async () => {
  let resolveRead;
  let reads = 0;
  const storage = memoryStorage();
  storage.getItem = () => { reads++; return new Promise((resolve) => { resolveRead = resolve; }); };
  const store = createGameDataStore(storage);
  const loading = store.load();
  assert.equal(store.load(), loading);
  store.setLanguage('am');
  store.setSoundsEnabled(false);
  assert.equal(store.getSnapshot().ready, false);
  assert.equal(storage.calls.length, 0);
  resolveRead(JSON.stringify({ ...createDefaultGameData(), language: 'om', soundsEnabled: false, menuMusicEnabled: false }));
  await loading;
  assert.equal(reads, 1);
  assert.equal(store.getSnapshot().data.language, 'om');
  assert.equal(store.getSnapshot().data.soundsEnabled, false);
  assert.equal(store.getSnapshot().data.menuMusicEnabled, false);
  assert.equal(storage.calls.length, 0);
});

test('rapid setting changes and scores are saved in order even when the first write is slow', async () => {
  const storage = memoryStorage();
  const originalSet = storage.setItem;
  let finishFirst;
  let writesStarted = 0;
  storage.setItem = async (key, value) => {
    writesStarted++;
    if (writesStarted === 1) await new Promise((resolve) => { finishFirst = resolve; });
    await originalSet(key, value);
  };
  const store = createGameDataStore(storage);
  await store.load();
  store.setSoundsEnabled(false);
  await Promise.resolve();
  store.setLanguage('am');
  store.setSoundsEnabled(true);
  store.setMenuMusicEnabled(false);
  store.recordHighScore('COMFORT', 500, 4, '2026-10-26');
  assert.equal(writesStarted, 1);
  finishFirst();
  await store.flush();
  assert.equal(writesStarted, 2, 'Only the in-flight save and latest pending snapshot should be written');
  assert.deepEqual(JSON.parse(storage.value), store.getSnapshot().data);
  const reopened = createGameDataStore(storage);
  await reopened.load();
  assert.equal(reopened.getSnapshot().data.language, 'am');
  assert.equal(reopened.getSnapshot().data.soundsEnabled, true);
  assert.equal(reopened.getSnapshot().data.menuMusicEnabled, false);
  assert.equal(reopened.getSnapshot().data.highScores.COMFORT[0].score, 500);
});

test('a failed read leaves existing disk data untouched while the game remains usable in memory', async () => {
  const original = JSON.stringify({ ...createDefaultGameData(), language: 'am' });
  const storage = memoryStorage(original);
  storage.getItem = async () => { throw new Error('Storage unavailable'); };
  const store = createGameDataStore(storage);
  await store.load();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().saveFailed, true);
  store.setLanguage('om');
  store.setSoundsEnabled(false);
  store.recordHighScore('CLASSIC', 999, 4, '2026-10-26');
  await store.flush();
  assert.equal(store.getSnapshot().data.language, 'om');
  assert.equal(storage.value, original);
  assert.equal(storage.calls.length, 0);
});

test('failed writes never crash gameplay and flushing retries the latest snapshot', async () => {
  const storage = memoryStorage();
  const originalSet = storage.setItem;
  let unavailable = true;
  storage.setItem = async (...args) => {
    if (unavailable) throw new Error('Storage full');
    return originalSet(...args);
  };
  const store = createGameDataStore(storage);
  await store.load();
  store.setLanguage('am');
  store.setSoundsEnabled(false);
  store.recordHighScore('CLASSIC', 600, 4, '2026-10-26');
  await store.flush();
  assert.equal(store.getSnapshot().saveFailed, true);
  assert.equal(store.getSnapshot().data.language, 'am');
  unavailable = false;
  await store.flush();
  assert.equal(store.getSnapshot().saveFailed, false);
  const reopened = createGameDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data, store.getSnapshot().data);
});
