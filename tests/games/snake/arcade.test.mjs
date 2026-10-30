import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSnakeGame, getSnakeLevel, getSnakeMaxScore, getSnakeTickMs,
  pauseSnake, queueDirection, restoreSnakeGame, resumeSnake, stepSnake,
  SNAKE_BONUS_TICKS, SNAKE_COMBO_TICKS, SNAKE_MODES,
} from '../../../src/games/snake/engine/snakeEngine.ts';

const playing = () => resumeSnake(createSnakeGame('NORMAL', 123456789, 'ARCADE'));
const clone = value => JSON.parse(JSON.stringify(value));
const equalPoint = (a, b) => a.x === b.x && a.y === b.y;

test('long seeded Arcade runs remain exactly restorable through chains, gold and expiry', () => {
  const directions = [
    { name: 'UP', dx: 0, dy: -1 }, { name: 'RIGHT', dx: 1, dy: 0 },
    { name: 'DOWN', dx: 0, dy: 1 }, { name: 'LEFT', dx: -1, dy: 0 },
  ];
  let collected = 0, golden = 0;
  for (let seed = 1; seed <= 12; seed++) {
    let game = resumeSnake(createSnakeGame('NORMAL', seed, 'ARCADE'));
    for (let tick = 0; tick < 1000 && game.status === 'PLAYING'; tick++) {
      const occupied = new Set([...game.body.slice(0, -1), ...game.rocks].map(p => `${p.x},${p.y}`));
      const target = game.bonus?.position ?? game.food;
      const queue = [{ ...game.body[0], first: null }];
      const visited = new Set([`${game.body[0].x},${game.body[0].y}`]);
      let heading;
      for (let index = 0; index < queue.length && !heading; index++) {
        const current = queue[index];
        for (const direction of directions) {
          const x = current.x + direction.dx, y = current.y + direction.dy;
          const key = `${x},${y}`;
          if (x < 0 || x >= 18 || y < 0 || y >= 18 || visited.has(key) || occupied.has(key)) continue;
          const first = current.first ?? direction.name;
          if (x === target.x && y === target.y) { heading = first; break; }
          visited.add(key);
          queue.push({ x, y, first });
        }
      }
      if (!heading) heading = directions.find(direction => {
        const x = game.body[0].x + direction.dx, y = game.body[0].y + direction.dy;
        return x >= 0 && x < 18 && y >= 0 && y < 18 && !occupied.has(`${x},${y}`);
      })?.name;
      const next = stepSnake(heading ? queueDirection(game, heading) : game);
      if (next.body.length > game.body.length) collected++;
      golden += next.bonusCollected - game.bonusCollected;
      game = next;
      if (game.status === 'PLAYING') assert.deepEqual(restoreSnakeGame(clone(game)), pauseSnake(game));
    }
  }
  assert.ok(collected >= 60, `The playthroughs should cover many pickups: ${collected}`);
  assert.ok(golden > 0, 'The playthroughs should cover real golden-fruit collection');
});
function feed(state, count = 1) {
  for (let i = 0; i < count; i++) {
    state = stepSnake({ ...state, food: { x: state.body[0].x + 1, y: state.body[0].y } });
  }
  return state;
}

test('Arcade starts paused in a permanent rock garden with deterministic safe food', () => {
  const game = createSnakeGame('EASY', 42, 'ARCADE');
  assert.deepEqual(SNAKE_MODES, ['CLASSIC', 'ARCADE']);
  assert.equal(game.rulesVersion, 2);
  assert.equal(game.mode, 'ARCADE');
  assert.equal(game.status, 'PAUSED');
  assert.equal(game.rocks.length, 8);
  assert.equal(new Set(game.rocks.map(p => `${p.x},${p.y}`)).size, 8);
  assert.ok(![...game.rocks, ...game.body].some(p => equalPoint(p, game.food)));
  assert.ok(game.rocks.every(p => p.y !== game.body[0].y));
  assert.deepEqual(game, createSnakeGame('EASY', 42, 'ARCADE'));
  game.rocks[0].x = 0;
  assert.equal(createSnakeGame('EASY', 42, 'ARCADE').rocks[0].x, 4, 'Garden geometry cannot be mutated globally');
});

test('quick pickups chain up to three times the score while growth and speed follow food count', () => {
  let game = playing();
  const scores = [10, 30, 60, 90, 120];
  for (let i = 0; i < scores.length; i++) {
    game = feed(game);
    assert.equal(game.score, scores[i]);
    assert.equal(game.body.length, 5 + i);
    assert.equal(game.combo, Math.min(i + 1, 3));
    assert.equal(game.bestCombo, game.combo);
    assert.equal(game.comboTicks, SNAKE_COMBO_TICKS);
  }
  assert.equal(getSnakeLevel(game), 2);
  assert.equal(getSnakeTickMs(game), 148, 'Bonus points do not accelerate the snake');
  assert.equal(getSnakeTickMs({ ...game, score: game.score + 5000 }), 148);
  assert.ok(game.bonus);
  assert.equal(game.bonus.ticksLeft, SNAKE_BONUS_TICKS);
  assert.ok(![...game.body, ...game.rocks, game.food].some(p => equalPoint(p, game.bonus.position)));
});

test('the last chain tick can be used, an expired chain restarts, and the best chain survives', () => {
  const first = feed(playing());
  const continued = feed({ ...first, comboTicks: 1 });
  assert.equal(continued.combo, 2);
  assert.equal(continued.score, 30);
  const expired = stepSnake({ ...continued, comboTicks: 1, food: { x: 0, y: 0 } });
  assert.equal(expired.comboTicks, 0);
  assert.equal(expired.combo, 0);
  assert.equal(expired.bestCombo, 2);
  const restarted = feed(expired);
  assert.equal(restarted.combo, 1);
  assert.equal(restarted.score, 40);
  assert.equal(restarted.bestCombo, 2);
});

test('golden fruit grants fifty points without growing or removing regular food', () => {
  const game = feed(playing(), 5);
  const nextCell = { x: game.body[0].x + 1, y: game.body[0].y };
  const ready = { ...game, food: { x: 1, y: 1 }, bonus: { position: nextCell, ticksLeft: 1 } };
  const next = stepSnake(ready);
  assert.equal(next.score, game.score + 50);
  assert.equal(next.body.length, game.body.length);
  assert.equal(next.bonus, null);
  assert.equal(next.bonusCollected, 1);
  assert.deepEqual(next.food, ready.food);
  assert.equal(next.seed, ready.seed);
  assert.equal(next.combo, game.combo);
  assert.equal(next.comboTicks, game.comboTicks - 1);
  assert.ok(restoreSnakeGame(next));
});

test('bonus expiry, pause and restored countdown state do not use wall-clock time', () => {
  const game = { ...feed(playing(), 5), bonus: { position: { x: 0, y: 0 }, ticksLeft: 1 }, food: { x: 1, y: 1 } };
  const paused = pauseSnake(game);
  assert.strictEqual(stepSnake(paused), paused);
  assert.deepEqual(restoreSnakeGame(clone(paused)), paused);
  const expired = stepSnake(resumeSnake(paused));
  assert.equal(expired.bonus, null);
  assert.equal(expired.score, game.score);
  assert.equal(expired.bonusCollected, 0);
  assert.equal(expired.comboTicks, SNAKE_COMBO_TICKS - 1);
});

test('rocks, walls and body collisions report distinct reasons without moving into danger', () => {
  const initial = playing();
  const cases = [
    { direction: 'UP', body: [5, 6, 7, 8].map(y => ({ x: 4, y })), reason: 'rock' },
    { direction: 'LEFT', body: [0, 1, 2, 3].map(x => ({ x, y: 8 })), reason: 'wall' },
    { direction: 'UP', body: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 1 }, { x: 2, y: 1 }], turnQueue: ['RIGHT'], reason: 'body' },
  ];
  for (const setup of cases) {
    const game = { ...initial, ...setup, food: { x: 1, y: 1 } };
    const next = stepSnake(game);
    assert.equal(next.status, 'GAME_OVER');
    assert.equal(next.deathReason, setup.reason);
    assert.deepEqual(next.body, game.body);
    assert.deepEqual(next.rocks, initial.rocks);
  }
});

test('collecting gold in a vacating tail cell is safe and still does not grow the snake', () => {
  const game = {
    ...playing(), direction: 'UP', food: { x: 0, y: 0 },
    body: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }],
    bonus: { position: { x: 2, y: 1 }, ticksLeft: 2 },
  };
  const next = stepSnake(queueDirection(game, 'RIGHT'));
  assert.equal(next.status, 'PLAYING');
  assert.deepEqual(next.body[0], { x: 2, y: 1 });
  assert.equal(next.body.length, 4);
  assert.equal(next.score, 50);
});

test('Arcade completion reserves the final cell for regular food and counts rocks as unavailable', () => {
  // A continuous route through every playable cell of the garden, in board-index order.
  const route = [
    0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,
    36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,
    72,73,74,75,93,92,91,90,108,109,110,111,112,94,95,113,114,96,78,79,80,81,82,83,101,100,99,98,97,115,116,117,
    118,119,120,102,103,121,122,104,86,87,88,89,107,106,105,123,124,125,143,142,141,140,139,138,137,136,135,134,
    133,132,131,130,129,128,127,126,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,
    179,178,177,176,175,174,173,172,171,170,169,168,167,166,165,164,163,162,180,181,182,183,184,185,186,187,
    188,189,190,191,192,193,194,195,196,197,215,214,213,212,211,210,209,208,207,206,205,204,203,202,201,200,
    199,198,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,251,250,249,248,266,265,
    264,263,245,244,243,242,241,240,258,257,256,255,237,236,235,234,252,253,254,272,271,270,288,306,307,289,
    290,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,305,304,303,302,301,300,299,298,297,
    296,295,294,293,292,291,273,274,275,276,277,259,260,278,279,261,262,280,281,282,283,284,285,267,268,269,287,286,
  ].map(index => ({ x: index % 18, y: Math.floor(index / 18) }));
  const game = {
    ...playing(), body: route.slice(2), direction: 'LEFT', score: 3100, bestCombo: 1,
    food: route[1], bonus: { position: route[0], ticksLeft: 12 },
  };
  assert.ok(restoreSnakeGame(game), 'Fixture must be a legal playable checkpoint');
  const almost = stepSnake(game);
  assert.equal(almost.status, 'PLAYING');
  assert.equal(almost.body.length, 315);
  assert.deepEqual(almost.food, route[0]);
  assert.equal(almost.bonus, null);
  const won = stepSnake(almost);
  assert.equal(won.status, 'WON');
  assert.equal(won.body.length, 316);
  assert.equal(won.food, null);
  assert.equal(won.bonus, null);
  assert.equal(won.score, 3130);
  assert.equal(getSnakeMaxScore('CLASSIC'), 3200);
  assert.equal(getSnakeMaxScore('ARCADE'), 12460);
});

test('legacy runs upgrade to Classic without changing their score, food or random future', () => {
  const original = resumeSnake(createSnakeGame('FAST', 42));
  const { rulesVersion, mode, rocks, combo, comboTicks, bestCombo, bonus, bonusCollected, deathReason, ...legacy } = original;
  const restored = restoreSnakeGame(clone(legacy));
  assert.deepEqual(restored, pauseSnake(original));
  assert.deepEqual(stepSnake(resumeSnake(restored)), stepSnake(original));
  assert.equal(restoreSnakeGame({ ...legacy, mode: 'ARCADE' }), null, 'Partial new schemas are rejected');
});

test('Arcade restores the exact garden, chain and bonus future without sharing mutable state', () => {
  const game = { ...feed(playing(), 5), food: { x: 1, y: 1 } };
  const queued = queueDirection(game, 'UP');
  const saved = clone(queued);
  const restored = restoreSnakeGame(saved);
  assert.deepEqual(restored, pauseSnake(queued));
  assert.deepEqual(stepSnake(resumeSnake(restored)), stepSnake(queued));
  restored.rocks[0].x = 0;
  restored.bonus.position.x = 0;
  restored.body[0].x = 0;
  assert.deepEqual(saved, queued);
});

test('corrupt Arcade additions cannot turn a saved run into an invalid garden or score', () => {
  const game = feed(playing(), 5);
  const invalid = [
    { ...game, rulesVersion: 3 }, { ...game, mode: 'OTHER' }, { ...game, rocks: [] },
    { ...game, rocks: [...game.rocks.slice(1), game.rocks[1]] },
    { ...game, rocks: [...game.rocks.slice(1), { x: 0, y: 0 }] },
    { ...game, food: game.rocks[0] }, { ...game, combo: 4 }, { ...game, combo: 0 },
    { ...game, comboTicks: 0 }, { ...game, comboTicks: SNAKE_COMBO_TICKS + 1 },
    { ...game, bestCombo: 0 }, { ...game, bestCombo: 4 }, { ...game, bonusCollected: 2 },
    { ...game, bonusCollected: -1 }, { ...game, score: 0 }, { ...game, score: 1000 },
    { ...game, bonus: undefined }, { ...game, bonus: { position: game.food, ticksLeft: 2 } },
    { ...game, bonus: { position: game.body[0], ticksLeft: 2 } },
    { ...game, bonus: { position: game.rocks[0], ticksLeft: 2 } },
    { ...game, bonus: { position: { x: -1, y: 0 }, ticksLeft: 2 } },
    { ...game, bonus: { position: game.bonus.position, ticksLeft: 0 } },
    { ...game, bonus: { position: game.bonus.position, ticksLeft: SNAKE_BONUS_TICKS + 1 } },
    { ...game, deathReason: 'rock' },
  ];
  invalid.forEach((value, index) => assert.equal(restoreSnakeGame(value), null, `Invalid Arcade save ${index}`));
  assert.equal(restoreSnakeGame({ ...game, bestCombo: 1, combo: 1 }), null, 'Score cannot exceed the recorded best multiplier');
  assert.equal(restoreSnakeGame({ ...game, bonusCollected: 1, score: game.score + 50 }), null, 'A collected bonus cannot also remain on the board');
  assert.equal(restoreSnakeGame({ ...feed(playing()), score: 20 }), null, 'The first food only earns ten points');
  const classic = createSnakeGame();
  assert.equal(restoreSnakeGame({ ...classic, combo: 1 }), null);
  assert.equal(restoreSnakeGame({ ...classic, bonusCollected: 1 }), null);
});

test('frozen Arcade snapshots remain unchanged while eating and placing gold', () => {
  const game = feed(playing(), 4);
  game.food = { x: game.body[0].x + 1, y: game.body[0].y };
  const before = clone(game);
  for (const point of [...game.body, ...game.rocks, game.food]) Object.freeze(point);
  Object.freeze(game.body); Object.freeze(game.rocks); Object.freeze(game.turnQueue); Object.freeze(game);
  assert.ok(stepSnake(game).bonus);
  assert.deepEqual(game, before);
});
