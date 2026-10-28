import assert from 'node:assert/strict';
import test from 'node:test';
import { getLevelProgress, getResolutionFeedback } from '../../../src/games/galaxy-balls/gameplay/feedback.ts';
import { createNewGameState, getGhostY, lockActivePieceAndResolve, SCORE_PER_LEVEL } from '../../../src/games/galaxy-balls/engine/galaxyEngine.ts';
import { LANGUAGES, translate } from '../../../src/shared/i18n/translations.ts';

const emptySummary = { clearedCount: 0, scoreDelta: 0, chainDepth: 0, specialTriggered: null, levelUp: false, gameOver: false, stoneLanded: false };

test('special, cascade and level-up messages are all retained for the same landing', () => {
  const feedback = getResolutionFeedback({ ...emptySummary, clearedCount: 9, scoreDelta: 165, chainDepth: 3, specialTriggered: 'BOMB', levelUp: true }, 4);
  assert.deepEqual(feedback.titles.map(({ key }) => key), ['bombBlast', 'cascade', 'levelUp']);
  assert.deepEqual(feedback.detail.values, { count: 9, points: 165 });
  assert.equal(feedback.titles.at(-1).values.level, 4);
});

test('actual star, bomb and flash clears show their count, score and level-up in every language', () => {
  const colors = new Set();
  for (const kind of ['STAR', 'BOMB', 'FLASH']) {
    const state = createNewGameState('COMFORT', {}, 123);
    state.score = SCORE_PER_LEVEL - 10;
    state.grid[9][2] = { kind: 'NORMAL', colorId: 0 };
    state.grid[9][4] = { kind: 'NORMAL', colorId: 0 };
    state.grid[9][1] = { kind: 'STONE' };
    state.activePiece = { x: 2, y: 8, cells: [{ dx: 0, dy: 0, kind }], isSingleSpecial: true };
    const summary = lockActivePieceAndResolve(state);
    assert.equal(summary.levelUp, true);
    const feedback = getResolutionFeedback(summary, state.level);
    assert.ok(feedback.titles.some(({ key }) => key === 'levelUp'));
    assert.equal(feedback.detail.values.count, summary.clearedCount);
    assert.equal(feedback.detail.values.points, summary.scoreDelta);
    colors.add(feedback.color);
    for (const { code } of LANGUAGES) {
      for (const message of [...feedback.titles, feedback.scope, feedback.detail]) {
        const text = translate(code, message.key, message.values);
        assert.ok(text.length > 0);
        assert.doesNotMatch(text, /\{\w+\}/);
      }
    }
  }
  assert.equal(colors.size, 3);
});

test('a star with no target explains the result instead of claiming a clear', () => {
  const state = createNewGameState('CLASSIC', {}, 123);
  state.activePiece = { x: 2, y: 9, cells: [{ dx: 0, dy: 0, kind: 'STAR' }], isSingleSpecial: true };
  const summary = lockActivePieceAndResolve(state);
  assert.equal(summary.clearedCount, 0);
  const feedback = getResolutionFeedback(summary, state.level);
  assert.equal(feedback.detail.key, 'starNoTarget');
  assert.equal(feedback.scope, undefined);
  assert.equal(getResolutionFeedback(emptySummary, 1), null);
});

test('a real two-wave cascade reports both its level-up and the complete score gain', () => {
  const state = createNewGameState('COMFORT', {}, 123);
  const rows = [[null, null, 2, 1, null, 2], [null, 2, 1, 1, 2, 2], [0, 2, 1, 2, 0, 1], [0, 1, 1, 2, 0, 2]];
  rows.forEach((row, y) => row.forEach((colorId, x) => {
    if (colorId !== null) state.grid[6 + y][x] = { kind: 'NORMAL', colorId };
  }));
  state.score = 170;
  state.activePiece = { x: 2, y: 0, isSingleSpecial: false, cells: [{ dx: 0, dy: 0, kind: 'NORMAL', colorId: 2 }, { dx: 1, dy: 0, kind: 'NORMAL', colorId: 0 }] };
  state.activePiece.y = getGhostY(state.grid, state.activePiece);
  const summary = lockActivePieceAndResolve(state);
  const feedback = getResolutionFeedback(summary, state.level);
  assert.deepEqual(feedback.titles.map(({ key }) => key), ['cascade', 'levelUp']);
  assert.equal(feedback.titles[0].values.count, 2);
  assert.deepEqual(feedback.detail.values, { count: 11, points: 125 });
  assert.equal(getLevelProgress(state.score, state.level, SCORE_PER_LEVEL).points, 115);
});

test('level progress resets at an exact threshold and remains bounded for old saves', () => {
  assert.deepEqual(getLevelProgress(90, 1, SCORE_PER_LEVEL), { points: 90, target: 180, fraction: 0.5 });
  assert.equal(getLevelProgress(180, 2, SCORE_PER_LEVEL).fraction, 0);
  assert.equal(getLevelProgress(179, 1, SCORE_PER_LEVEL).points, 179);
  assert.equal(getLevelProgress(0, 4, SCORE_PER_LEVEL).points, 0);
  assert.equal(getLevelProgress(999, 1, SCORE_PER_LEVEL).fraction, 1);
});
