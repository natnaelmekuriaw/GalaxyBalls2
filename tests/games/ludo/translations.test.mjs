import assert from 'node:assert/strict';
import test from 'node:test';

import { LUDO_TRANSLATIONS, translateLudo } from '../../../src/games/ludo/i18n/translations.ts';

test('every Ludo language covers the match controls with matching placeholders', () => {
  const english = LUDO_TRANSLATIONS.en;
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const language of ['am', 'om']) {
    assert.deepEqual(Object.keys(LUDO_TRANSLATIONS[language]).sort(), Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      assert.ok(LUDO_TRANSLATIONS[language][key].trim(), `${language}.${key}`);
      assert.deepEqual(placeholders(LUDO_TRANSLATIONS[language][key]), placeholders(english[key]), `${language}.${key}`);
    }
  }
  assert.equal(translateLudo('en', 'vsBots', { count: 3 }), 'You vs 3 CPU');
});
