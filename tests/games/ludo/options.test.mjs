import assert from 'node:assert/strict';
import test from 'node:test';
import { LUDO_OPTION_LABELS, ludoOption } from '../../../src/games/ludo/i18n/options.ts';
test('every new setup, board, and audio option is translated in all three languages', () => {
  const keys = Object.keys(LUDO_OPTION_LABELS.en).sort();
  for (const language of ['en', 'am', 'om']) {
    assert.deepEqual(Object.keys(LUDO_OPTION_LABELS[language]).sort(), keys);
    for (const key of keys) assert.ok(ludoOption(language, key).trim().length > 0);
  }
  assert.equal(ludoOption('unknown', 'music'), 'Music');
});
