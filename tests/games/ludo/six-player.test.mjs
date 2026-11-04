import assert from 'node:assert/strict';
import test from 'node:test';
import { createLudoGame, finishFor, trackLength, rollLudo, moveLudoToken, trackIndex, legalTokens, chooseComputerToken, LUDO_COLORS } from '../../../src/games/ludo/engine/ludoEngine.ts';
import { parseLudoSave } from '../../../src/games/ludo/data/ludoSave.ts';
import { SIX_TRACK, SIX_HOMES, SIX_YARDS, sixTokenCell } from '../../../src/games/ludo/board/sixGeometry.ts';

test('every mix of two to six seats creates and restores the requested match', () => {
  assert.throws(() => createLudoGame({ humans: 2.5, computers: 1 }));
  assert.throws(() => createLudoGame({ humans: 1, computers: Infinity }));
  for (let total = 2; total <= 6; total++) for (let humans = 1; humans <= total; humans++) {
    const game = createLudoGame({ humans, computers: total - humans }, 99);
    assert.equal(game.seats.length, total);
    assert.equal(game.seats.filter(seat => seat.kind === 'human').length, humans);
    assert.deepEqual(parseLudoSave(JSON.stringify(game)), game);
    assert.equal(trackLength(game), total > 4 ? 78 : 52);
  }
});
test('six-player geometry has a unique 78-cell track, private home lanes, and bounded yards', () => {
  assert.equal(SIX_TRACK.length, 78);
  assert.equal(new Set(SIX_TRACK.map(p => `${p.x},${p.y}`)).size, 78);
  for (const color of LUDO_COLORS) {
    assert.equal(SIX_HOMES[color].length, 6);
    assert.equal(SIX_YARDS[color].length, 4);
    assert.deepEqual(sixTokenCell(color, 0, 0), SIX_TRACK[trackIndex(color, 0, true)]);
    const approach = SIX_TRACK[trackIndex(color, 77, true)];
    const home = SIX_HOMES[color][0];
    assert.ok(Math.hypot(approach.x - home.x, approach.y - home.y) < 1, 'home entry must follow the last shared square');
    for (const p of [...SIX_HOMES[color], ...SIX_YARDS[color]]) assert.ok(p.x > 0 && p.x < 15 && p.y > 0 && p.y < 15);
  }
});
test('six-player captures use the expanded track and exact finishing roll', () => {
  let game = createLudoGame({ humans: 6, computers: 0 }, 4);
  game.seats[0].tokens[0] = 15;
  game.seats[1].tokens[0] = 5;
  game = moveLudoToken(rollLudo(game, 3), 0);
  assert.equal(game.event, 'capture');
  assert.equal(game.seats[1].tokens[0], -1);
  game.seats[0].tokens = [83, 84, 84, 84];
  assert.equal(legalTokens(rollLudo(game, 2)).length, 0);
  game = moveLudoToken(rollLudo(game, 1), 0);
  assert.equal(finishFor(game), 84);
  assert.equal(game.winner, 'red');
  assert.deepEqual(parseLudoSave(JSON.stringify(game)), game);
});
test('a mixed six-player match can advance all seats without invalid saves', () => {
  let game = createLudoGame({ humans: 1, computers: 5 }, 31);
  for (let i = 0; i < 1500 && game.phase !== 'finished'; i++) {
    game = game.phase === 'roll' ? rollLudo(game) : moveLudoToken(game, chooseComputerToken(game) ?? legalTokens(game)[0]);
    assert.deepEqual(parseLudoSave(JSON.stringify(game)), game);
  }
});
test('each player keeps their own die result through turn changes and saving', () => {
  let game = createLudoGame({ humans: 6, computers: 0 }, 1);
  game = rollLudo(game, 2);
  game = rollLudo(game, 4);
  assert.equal(game.rolls.red, 2);
  assert.equal(game.rolls.green, 4);
  assert.deepEqual(parseLudoSave(JSON.stringify(game)).rolls, { red: 2, green: 4 });
});
