import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseComputerToken, createLudoGame, FINISH, legalTokens, moveLudoToken, rollLudo,
  SAFE_INDEX, trackIndex } from '../../../src/games/ludo/engine/ludoEngine.ts';

test('two players sit opposite; local groups and computer matches have the requested seats', () => {
  assert.deepEqual(createLudoGame({ humans: 2, computers: 0 }).seats.map(seat => seat.color), ['red', 'yellow']);
  assert.deepEqual(createLudoGame({ humans: 1, computers: 3 }).seats.map(seat => seat.kind),
    ['human', 'computer', 'computer', 'computer']);
  assert.equal(createLudoGame({ humans: 4, computers: 0 }).seats.length, 4);
  assert.throws(() => createLudoGame({ humans: 1, computers: 0 }));
  assert.throws(() => createLudoGame({ humans: 1, computers: 4 }));
});

test('a six releases a token and earns another roll; other rolls pass the turn', () => {
  let game = createLudoGame({ humans: 2, computers: 0 }, 7);
  game = rollLudo(game, 6);
  assert.deepEqual(legalTokens(game), [0, 1, 2, 3]);
  game = moveLudoToken(game, 0);
  assert.equal(game.seats[0].tokens[0], 0);
  assert.equal(game.turn, 0);
  game = rollLudo(game, 2);
  assert.deepEqual(legalTokens(game), [0]);
  game = moveLudoToken(game, 0);
  assert.equal(game.seats[0].tokens[0], 2);
  assert.equal(game.turn, 1);
});

test('no legal move passes; three consecutive sixes forfeit the turn', () => {
  let game = rollLudo(createLudoGame({ humans: 2, computers: 0 }), 3);
  assert.equal(game.turn, 1);
  assert.equal(game.event, 'noMove');
  game = { ...game, turn: 0 };
  game = moveLudoToken(rollLudo(game, 6), 0);
  game = moveLudoToken(rollLudo(game, 6), 1);
  game = rollLudo(game, 6);
  assert.equal(game.event, 'threeSixes');
  assert.equal(game.turn, 1);
  assert.equal(game.phase, 'roll');
  assert.equal(game.seats[0].tokens[2], -1);
});

test('safe squares protect tokens; a capture returns a rival to base and grants another roll', () => {
  const base = createLudoGame({ humans: 2, computers: 0 });
  const landing = trackIndex('red', 5);
  assert.equal(SAFE_INDEX.has(landing), false);
  const yellowProgress = (landing - trackIndex('yellow', 0) + 52) % 52;
  let game = { ...base, seats: [
    { ...base.seats[0], tokens: [4, -1, -1, -1] },
    { ...base.seats[1], tokens: [yellowProgress, -1, -1, -1] },
  ] };
  game = moveLudoToken(rollLudo(game, 1), 0);
  assert.equal(game.seats[1].tokens[0], -1);
  assert.equal(game.turn, 0);
  assert.equal(game.event, 'capture');

  const safeLanding = trackIndex('red', 0);
  const safeYellowProgress = (safeLanding - trackIndex('yellow', 0) + 52) % 52;
  game = { ...base, seats: [
    { ...base.seats[0], tokens: [-1, -1, -1, -1] },
    { ...base.seats[1], tokens: [safeYellowProgress, -1, -1, -1] },
  ] };
  game = moveLudoToken(rollLudo(game, 6), 0);
  assert.equal(game.seats[1].tokens[0], safeYellowProgress);
});

test('home needs an exact roll, and finishing all four tokens wins', () => {
  const base = createLudoGame({ humans: 2, computers: 0 });
  let game = { ...base, seats: [{ ...base.seats[0], tokens: [FINISH - 2, FINISH, FINISH, FINISH] }, base.seats[1]] };
  const overshoot = rollLudo(game, 3);
  assert.equal(overshoot.turn, 1);
  game = moveLudoToken(rollLudo(game, 2), 0);
  assert.equal(game.winner, 'red');
  assert.equal(game.phase, 'finished');
  assert.equal(game.seats[0].tokens[0], FINISH);
});

test('computer prefers a capture over an ordinary move', () => {
  const base = createLudoGame({ humans: 1, computers: 1 });
  const landing = trackIndex('yellow', 5);
  const redProgress = (landing - trackIndex('red', 0) + 52) % 52;
  const game = rollLudo({ ...base, turn: 1, seats: [
    { ...base.seats[0], tokens: [redProgress, -1, -1, -1] },
    { ...base.seats[1], tokens: [4, 10, -1, -1] },
  ] }, 1);
  assert.equal(chooseComputerToken(game), 0);
});
