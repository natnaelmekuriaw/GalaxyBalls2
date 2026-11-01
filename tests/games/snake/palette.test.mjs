import assert from 'node:assert/strict';
import test from 'node:test';
import { createSnakeGame, getSnakeLevel, restoreSnakeGame, resumeSnake, stepSnake } from '../../../src/games/snake/engine/snakeEngine.ts';
import { getSnakePalette } from '../../../src/games/snake/presentation/palette.ts';

function luminance(hex) {
  const channels = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test('a new run keeps the familiar green and levelling changes the whole connected trail', () => {
  const first = getSnakePalette(1);
  const second = getSnakePalette(2);
  assert.equal(first.head, '#C8FF7A');
  assert.notEqual(second.head, first.head);
  assert.equal(second.body.length, first.body.length);
  for (let index = 0; index < first.body.length; index++) assert.notEqual(second.body[index], first.body[index]);
});

test('every playable level keeps the head and entire tail visible against the garden', () => {
  const background = luminance('#0A2525');
  for (let level = 1; level <= 65; level++) {
    const palette = getSnakePalette(level);
    assert.ok((luminance(palette.head) + 0.05) / (background + 0.05) >= 7, `Level ${level}: head contrast`);
    for (const color of palette.body) {
      assert.match(color, /^#[\dA-F]{6}$/);
      assert.ok((luminance(color) + 0.05) / (background + 0.05) >= 4, `Level ${level}: tail contrast`);
    }
  }
});

test('resuming a real checkpoint keeps its earned color without needing another pickup', () => {
  let game = resumeSnake(createSnakeGame('NORMAL', 123456789));
  for (let food = 0; food < 5; food++) {
    game = stepSnake({ ...game, food: { x: game.body[0].x + 1, y: game.body[0].y } });
  }
  const restored = restoreSnakeGame(JSON.parse(JSON.stringify(game)));
  assert.ok(restored);
  assert.equal(restored.status, 'PAUSED');
  assert.equal(getSnakeLevel(restored), 2);
  assert.equal(getSnakePalette(getSnakeLevel(restored)).head, '#AEFFC1');
  assert.equal(getSnakePalette(getSnakeLevel(createSnakeGame('NORMAL', 98765))).head, '#C8FF7A');
});
