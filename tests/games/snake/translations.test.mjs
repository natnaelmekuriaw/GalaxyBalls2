import assert from 'node:assert/strict';
import test from 'node:test';

import { SNAKE_TRANSLATIONS, translateSnake } from '../../../src/games/snake/i18n/translations.ts';

test('all three Snake languages have complete, non-empty text and matching placeholders', () => {
  const keys = Object.keys(SNAKE_TRANSLATIONS.en).sort();
  const placeholders = (text) => [...text.matchAll(/\{\w+\}/g)].map(([token]) => token).sort();
  assert.deepEqual(Object.keys(SNAKE_TRANSLATIONS), ['en', 'am', 'om']);
  for (const [language, messages] of Object.entries(SNAKE_TRANSLATIONS)) {
    assert.deepEqual(Object.keys(messages).sort(), keys, language);
    for (const key of keys) {
      assert.ok(messages[key].trim().length > 0, `${language}.${key}`);
      assert.deepEqual(placeholders(messages[key]), placeholders(SNAKE_TRANSLATIONS.en[key]), `${language}.${key}`);
    }
  }
});

test('Snake countdown interpolates in every language and unknown locales fall back to English', () => {
  for (const language of Object.keys(SNAKE_TRANSLATIONS)) {
    assert.equal(translateSnake(language, 'countdown', { count: 3 }), '3');
    assert.equal(translateSnake(language, 'title'), SNAKE_TRANSLATIONS[language].title);
  }
  assert.equal(translateSnake('unknown', 'play'), 'PLAY');
});
