import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PREFERENCES, parsePreferences } from '../../../src/games/ludo/data/preferences.ts';
import { THEME_IDS } from '../../../src/games/ludo/board/themes.ts';
test('classic is the default; each board style, audio switch, and mixed setup survives reopening', () => {
  assert.equal(DEFAULT_PREFERENCES.theme, 'classic');
  for (const theme of THEME_IDS) {
    const preferences = { theme, music: false, sound: true, humans: 3, computers: 3 };
    assert.deepEqual(parsePreferences(JSON.stringify(preferences)), preferences);
  }
});
test('malformed preferences cannot create a broken or oversized match', () => {
  for (const value of [null, 'broken', 'null', '{}', '{"humans":6,"computers":5}', '{"humans":0,"computers":0}']) {
    const preferences = parsePreferences(value);
    assert.ok(preferences.humans >= 1 && preferences.computers >= 0);
    assert.ok(preferences.humans + preferences.computers >= 2 && preferences.humans + preferences.computers <= 6);
  }
});
