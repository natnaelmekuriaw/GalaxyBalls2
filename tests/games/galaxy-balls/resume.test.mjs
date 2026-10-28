import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultAppData, createAppDataStore, parseAppData } from '../../../src/data/appDataStore.ts';
import { parseCurrentGame, snapshotCurrentGame } from '../../../src/games/galaxy-balls/data/galaxyBallsData.ts';
import { createNewGameState, generatePiece, getGhostY, getPiecePreview, lockActivePieceAndResolve, movePiece, rotateActivePiece, stepGravityTick } from '../../../src/games/galaxy-balls/engine/galaxyEngine.ts';

const plain = (value) => JSON.parse(JSON.stringify(value));
function storageWith(value = null) {
  return {
    value,
    async getItem() { return this.value; },
    async setItem(_key, next) { this.value = next; },
  };
}

function placePiece(state, direction) {
  movePiece(state, direction, 0);
  rotateActivePiece(state);
  state.activePiece.y = getGhostY(state.grid, state.activePiece);
  return lockActivePieceAndResolve(state);
}

test('existing version-one saves keep preferences and scores without inventing a current game', () => {
  const older = plain(createDefaultAppData());
  delete older.currentGame;
  older.language = 'am';
  older.soundsEnabled = false;
  older.highScores.CLASSIC = [{ alias: 'YOU', score: 456, level: 3, date: '2026-10-27' }];
  const restored = parseAppData(JSON.stringify(older));
  assert.equal(restored.currentGame, null);
  assert.equal(restored.language, 'am');
  assert.equal(restored.soundsEnabled, false);
  assert.equal(restored.highScores.CLASSIC[0].score, 456);
});

test('all modes and rotation strategies restore the board, current piece, preview and progress paused', async () => {
  for (const mode of ['CLASSIC', 'COMFORT', 'PRACTICE']) for (const rotationMode of ['GEOMETRY_90', 'COLOR_CYCLE']) {
    const storage = storageWith();
    const store = createAppDataStore(storage);
    await store.load();
    const state = createNewGameState(mode, { rotationMode }, 123);
    placePiece(state, -2);
    placePiece(state, 2);
    movePiece(state, -1, 0);
    rotateActivePiece(state);
    stepGravityTick(state);
    store.saveCurrentGame(state);
    await store.flush();
    const reopened = createAppDataStore(storage);
    await reopened.load();
    const restored = reopened.getSnapshot().data.currentGame;
    assert.deepEqual(restored, plain({ ...state, status: 'PAUSED' }));
    assert.deepEqual(getPiecePreview(restored.nextPiece), getPiecePreview(state.nextPiece));
    assert.equal(stepGravityTick(restored), null, 'The saved game must stay frozen before Resume');
    assert.equal(restored.config.mode, mode);
    assert.equal(restored.config.rotationMode, rotationMode);
  }
});

test('saving copies every mutable part so later engine changes cannot mutate the saved game', async () => {
  const store = createAppDataStore(storageWith());
  await store.load();
  const state = createNewGameState('COMFORT', {}, 21);
  store.saveCurrentGame(state);
  const saved = store.getSnapshot().data.currentGame;
  const expected = plain(saved);
  state.grid[9][0] = { kind: 'STONE' };
  state.activePiece.x = 0;
  state.activePiece.cells[0].colorId = 4;
  state.nextPiece.cells[0].colorId = 3;
  state.config.rotationMode = 'COLOR_CYCLE';
  assert.deepEqual(plain(saved), expected);
});

test('resuming produces the same future pieces, clears and random sequence as uninterrupted play', () => {
  for (const mode of ['CLASSIC', 'COMFORT']) for (const rotationMode of ['GEOMETRY_90', 'COLOR_CYCLE']) {
    const uninterrupted = createNewGameState(mode, { rotationMode }, 2147483639);
    placePiece(uninterrupted, -2);
    movePiece(uninterrupted, 1, 0);
    const restored = parseCurrentGame(plain(snapshotCurrentGame(uninterrupted)));
    assert.ok(restored);
    restored.status = 'PLAYING';
    for (let turn = 0; turn < 12; turn++) {
      const direction = turn % 2 === 0 ? -2 : 2;
      const expected = placePiece(uninterrupted, direction);
      const actual = placePiece(restored, direction);
      assert.deepEqual(actual, expected);
      assert.deepEqual(plain(restored), plain(uninterrupted));
      if (actual.gameOver) break;
    }
  }
});

test('a real matching clear and level advance retain score, mascot and next piece across reopening', async () => {
  const state = createNewGameState('CLASSIC', {}, 123);
  state.score = 150;
  state.grid[9][0] = state.grid[9][1] = { kind: 'NORMAL', colorId: 0 };
  state.activePiece = { x: 2, y: 9, isSingleSpecial: false, cells: [
    { dx: 0, dy: 0, kind: 'NORMAL', colorId: 0 }, { dx: 1, dy: 0, kind: 'NORMAL', colorId: 1 },
  ] };
  assert.equal(lockActivePieceAndResolve(state).levelUp, true);
  const storage = storageWith();
  const store = createAppDataStore(storage);
  await store.load();
  store.saveCurrentGame(state);
  await store.flush();
  const reopened = createAppDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.currentGame, plain({ ...state, status: 'PAUSED' }));
  assert.equal(reopened.getSnapshot().data.currentGame.score, 180);
  assert.equal(reopened.getSnapshot().data.currentGame.level, 2);
});

test('all generated shapes, stones and special pieces can be saved and restored', () => {
  const sizes = new Set();
  const specials = new Set();
  let sawStone = false;
  for (let seed = 1; seed <= 512; seed++) {
    const state = createNewGameState('COMFORT', { experimentalFourBlockPieces: true }, seed);
    state.level = 4;
    state.activePiece = generatePiece(state.config, 4, state.seed, 0).piece;
    sizes.add(state.activePiece.cells.length);
    for (const { kind } of state.activePiece.cells) {
      if (kind === 'STONE') sawStone = true;
      if (['BOMB', 'FLASH', 'STAR'].includes(kind)) specials.add(kind);
    }
    const restored = parseCurrentGame(plain(state));
    assert.ok(restored, `Generated piece at seed ${seed} must be resumable`);
    assert.deepEqual(restored.activePiece, plain(state.activePiece));
  }
  assert.deepEqual([...sizes].sort(), [1, 2, 3, 4]);
  assert.equal(sawStone, true);
  assert.deepEqual([...specials].sort(), ['BOMB', 'FLASH', 'STAR']);
});

test('damaged current games are discarded without losing language, audio or leaderboard data', () => {
  const valid = plain(createNewGameState('CLASSIC', {}, 123));
  const corruptions = [
    (s) => { s.grid.pop(); }, (s) => { s.grid[0].pop(); },
    (s) => { s.grid[9][0] = { kind: 'UNKNOWN' }; }, (s) => { s.grid[9][0] = { kind: 'NORMAL', colorId: -1 }; },
    (s) => { s.activePiece = null; }, (s) => { s.activePiece.x = 6; }, (s) => { s.activePiece.y = -1; },
    (s) => { s.activePiece.cells.push(s.activePiece.cells[0]); },
    (s) => { s.activePiece.cells[1].dy = 2; s.activePiece.cells[1].dx = 2; },
    (s) => { s.grid[s.activePiece.y][s.activePiece.x] = { kind: 'STONE' }; },
    (s) => { s.nextPiece.y = 9; }, (s) => { s.nextPiece.cells = []; },
    (s) => { s.config.initialFallMs = 0; }, (s) => { s.config.numColors = 100; },
    (s) => { s.config.rotationMode = 'UNKNOWN'; }, (s) => { s.config.specialChanceBase = 2; },
    (s) => { s.config.mode = { toString: 123 }; }, (s) => { s.grid[9][0].kind = { toString: 123 }; },
    (s) => { s.mascotMood = { toString: 123 }; }, (s) => { s.lastSpecialTriggered = { toString: 123 }; },
    (s) => { s.score = -1; }, (s) => { s.level = 0; }, (s) => { s.seed = null; },
    (s) => { s.piecesPlaced = 1.5; }, (s) => { s.mascotIndex = 4; }, (s) => { s.status = 'GAME_OVER'; },
  ];
  for (const corrupt of corruptions) {
    const state = plain(valid);
    corrupt(state);
    const data = { ...createDefaultAppData(), language: 'om', soundsEnabled: false, currentGame: state };
    const restored = parseAppData(JSON.stringify(data));
    assert.equal(restored.currentGame, null, corrupt.toString());
    assert.equal(restored.language, 'om');
    assert.equal(restored.soundsEnabled, false);
    assert.deepEqual(restored.highScores, data.highScores);
  }
});

test('a future piece may be blocked at its spawn while the active piece is still playable', () => {
  const state = createNewGameState('CLASSIC', {}, 123);
  state.activePiece.x = 0;
  state.grid[0][2] = { kind: 'STONE' };
  assert.ok(parseCurrentGame(plain(state)));
});

test('a new game replaces the checkpoint while preserving preferences and high scores', async () => {
  const storage = storageWith();
  const store = createAppDataStore(storage);
  await store.load();
  store.setLanguage('om');
  store.setSoundsEnabled(false);
  store.saveCurrentGame(createNewGameState('COMFORT', {}, 123));
  const replacement = createNewGameState('CLASSIC', { rotationMode: 'COLOR_CYCLE' }, 456);
  store.saveCurrentGame(replacement);
  await store.flush();
  const reopened = createAppDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.currentGame, plain({ ...replacement, status: 'PAUSED' }));
  assert.equal(reopened.getSnapshot().data.language, 'om');
  assert.equal(reopened.getSnapshot().data.soundsEnabled, false);
  assert.deepEqual(reopened.getSnapshot().data.highScores, createDefaultAppData().highScores);
});

test('many checkpoints keep one pending write and cannot resurrect a finished run', async () => {
  const storage = storageWith();
  const setItem = storage.setItem.bind(storage);
  let finishFirst;
  let writeCount = 0;
  storage.setItem = async (key, value) => {
    if (++writeCount === 1) await new Promise((resolve) => { finishFirst = resolve; });
    await setItem(key, value);
  };
  const store = createAppDataStore(storage);
  await store.load();
  const state = createNewGameState('COMFORT', {}, 123);
  store.saveCurrentGame(state);
  for (let index = 0; index < 200; index++) {
    state.piecesPlaced = index;
    store.saveCurrentGame(state);
  }
  store.setLanguage('am');
  store.setMenuMusicEnabled(false);
  state.status = 'GAME_OVER';
  state.activePiece = null;
  state.score = 450;
  state.level = 3;
  store.finishGame(state, '2026-10-27');
  store.finishGame(state, '2026-10-27');
  store.saveCurrentGame(state);
  assert.equal(store.getSnapshot().data.currentGame, null);
  assert.equal(writeCount, 1);
  finishFirst();
  await store.flush();
  assert.equal(writeCount, 2);
  const reopened = createAppDataStore(storage);
  await reopened.load();
  const data = reopened.getSnapshot().data;
  assert.equal(data.currentGame, null);
  assert.equal(data.language, 'am');
  assert.equal(data.menuMusicEnabled, false);
  assert.equal(data.highScores.COMFORT.filter(({ alias }) => alias === 'YOU').length, 1);
  assert.equal(data.highScores.COMFORT[0].score, 450);
});

test('zero-score and practice game overs clear the checkpoint without recording a high score', async () => {
  for (const mode of ['CLASSIC', 'PRACTICE']) {
    const storage = storageWith();
    const store = createAppDataStore(storage);
    await store.load();
    const state = createNewGameState(mode, {}, 123);
    store.saveCurrentGame(state);
    state.status = 'GAME_OVER';
    if (mode === 'PRACTICE') state.score = 500;
    store.finishGame(state);
    await store.flush();
    const reopened = createAppDataStore(storage);
    await reopened.load();
    assert.equal(reopened.getSnapshot().data.currentGame, null);
    assert.deepEqual(reopened.getSnapshot().data.highScores, createDefaultAppData().highScores);
  }
});

test('a failed checkpoint write can retry and restore the exact game later', async () => {
  const storage = storageWith();
  const setItem = storage.setItem.bind(storage);
  let unavailable = true;
  storage.setItem = async (...args) => {
    if (unavailable) throw new Error('Storage unavailable');
    await setItem(...args);
  };
  const store = createAppDataStore(storage);
  await store.load();
  const state = createNewGameState('CLASSIC', {}, 123);
  placePiece(state, -2);
  store.saveCurrentGame(state);
  await store.flush();
  assert.equal(store.getSnapshot().saveFailed, true);
  unavailable = false;
  await store.flush();
  const reopened = createAppDataStore(storage);
  await reopened.load();
  assert.deepEqual(reopened.getSnapshot().data.currentGame, plain(snapshotCurrentGame(state)));
});
