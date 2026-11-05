import assert from 'node:assert/strict';
import test from 'node:test';

import { HOME_LANES, TRACK, YARDS, cellColor, cellIsSafe, cellIsTrack, tokenCell } from '../../../src/games/ludo/board/geometry.ts';
import { LUDO_COLORS, START_INDEX } from '../../../src/games/ludo/engine/ludoEngine.ts';

test('the Ludo board has 52 unique shared squares and six private squares per color', () => {
  assert.equal(TRACK.length, 52);
  assert.equal(new Set(TRACK.map(cell => `${cell.x},${cell.y}`)).size, 52);
  for (const color of LUDO_COLORS.slice(0, 4)) {
    assert.equal(HOME_LANES[color].length, 6);
    for (const point of HOME_LANES[color]) assert.equal(cellColor(point.x, point.y), color);
    for (const cell of HOME_LANES[color]) assert.equal(cellIsTrack(cell.x, cell.y), false);
    const beforeHome = TRACK[(START_INDEX[color] + 51) % 52];
    const firstHome = HOME_LANES[color][0];
    assert.equal(Math.abs(beforeHome.x - firstHome.x) + Math.abs(beforeHome.y - firstHome.y), 1);
    assert.deepEqual(tokenCell(color, 0, 0), TRACK[START_INDEX[color]]);
    assert.deepEqual(tokenCell(color, 0, -1), YARDS[color][0]);
    assert.deepEqual(tokenCell(color, 0, 52), firstHome);
    assert.deepEqual(tokenCell(color, 0, 58), { x: 7, y: 7 });
  }
});

test('starting squares and four additional marked squares are safe', () => {
  assert.equal(TRACK.filter(cell => cellIsSafe(cell.x, cell.y)).length, 8);
  for (const color of LUDO_COLORS.slice(0, 4)) {
    const start = TRACK[START_INDEX[color]];
    assert.equal(cellIsSafe(start.x, start.y), true);
  }
});
