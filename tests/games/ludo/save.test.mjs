import assert from 'node:assert/strict';
import test from 'node:test';

import { parseLudoSave } from '../../../src/games/ludo/data/ludoSave.ts';
import { createLudoGame, moveLudoToken, rollLudo } from '../../../src/games/ludo/engine/ludoEngine.ts';

test('a match restores on the same turn with its die, tokens, and computer seats', () => {
  const started = createLudoGame({ humans: 1, computers: 3 }, 429);
  const choosing = rollLudo(started, 6);
  assert.deepEqual(parseLudoSave(JSON.stringify(choosing)), choosing);
  const moved = moveLudoToken(choosing, 0);
  assert.deepEqual(parseLudoSave(JSON.stringify(moved)), moved);
});

test('invalid and tampered matches are ignored rather than crashing play', () => {
  const base = createLudoGame({ humans: 2, computers: 0 });
  const bad = [
    null, '{', JSON.stringify({ ...base, version: 99 }),
    JSON.stringify({ ...base, turn: 9 }),
    JSON.stringify({ ...base, seats: [base.seats[0], base.seats[0]] }),
    JSON.stringify({ ...base, seats: [{ ...base.seats[0], tokens: [99, -1, -1, -1] }, base.seats[1]] }),
    JSON.stringify({ ...base, phase: 'choose', die: 2 }),
    JSON.stringify({ ...base, phase: 'finished', winner: 'red' }),
  ];
  for (const raw of bad) assert.equal(parseLudoSave(raw), null);
});
