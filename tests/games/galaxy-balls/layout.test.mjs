import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARENA_PADDING, BOARD_FRAME_SIZE, getGameArenaLayout,
  MASCOT_HEIGHT, MASCOT_WIDTH, PREVIEW_BRIDGE_WIDTH, PREVIEW_FRAME_SIZE,
} from '../../../src/games/galaxy-balls/layout/game-layout.ts';

const grid = { columns: 6, rows: 10, previewColumns: 3 };

test('the full board and side column fit phone, landscape and tablet arena space', () => {
  for (const [width, height] of [[320, 250], [320, 390], [390, 600], [568, 110], [844, 180], [768, 800], [1024, 550]]) {
    const layout = getGameArenaLayout(width, height, grid);
    assert.ok(layout.boardWidth + layout.rightColumnWidth + ARENA_PADDING * 2 <= width, `width at ${width}×${height}`);
    assert.ok(layout.boardHeight + ARENA_PADDING * 2 <= height, `height at ${width}×${height}`);
    assert.equal((layout.boardWidth - BOARD_FRAME_SIZE) / layout.cellSize, grid.columns);
    assert.equal((layout.boardHeight - BOARD_FRAME_SIZE) / layout.cellSize, grid.rows);
    assert.ok(layout.previewCellSize > 0);
    assert.ok(layout.previewCellSize < layout.cellSize);
  }
});

test('the entire preview and bouncing pilot fit beside the board on short screens', () => {
  for (const [width, height] of [[320, 200], [568, 110], [844, 180], [390, 600]]) {
    const { previewCellSize, rightColumnWidth, boardHeight, mascotScale } = getGameArenaLayout(width, height, grid);
    const previewWidth = grid.previewColumns * previewCellSize + PREVIEW_FRAME_SIZE;
    assert.ok(previewWidth + PREVIEW_BRIDGE_WIDTH <= rightColumnWidth);
    assert.ok(mascotScale >= 0 && mascotScale <= 1);
    assert.ok(MASCOT_WIDTH * mascotScale <= rightColumnWidth);
    assert.ok(previewWidth + MASCOT_HEIGHT * mascotScale + 16 + 12 + 20 <= boardHeight + 0.001);
  }
});

test('resizing in both directions recalculates square cells without depending on startup dimensions', () => {
  const portrait = getGameArenaLayout(390, 600, grid);
  const landscape = getGameArenaLayout(844, 180, grid);
  assert.ok(landscape.cellSize < portrait.cellSize);
  assert.deepEqual(getGameArenaLayout(390, 600, grid), portrait);
  assert.ok(getGameArenaLayout(320, 600, grid).cellSize < portrait.cellSize);
  assert.ok(getGameArenaLayout(2048, 1600, grid).cellSize <= 56);
});
