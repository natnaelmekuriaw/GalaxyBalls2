import assert from 'node:assert/strict';
import test from 'node:test';

import { LANGUAGES, TRANSLATIONS, translate } from '../../src/shared/i18n/translations.ts';

test('each selectable language has every game message and matching placeholders', () => {
  const keys = Object.keys(TRANSLATIONS.en).sort();
  const placeholders = (text) => [...text.matchAll(/\{\w+\}/g)].map(([token]) => token).sort();
  assert.deepEqual(LANGUAGES.map(({ code }) => code), ['en', 'am', 'om']);
  for (const { code } of LANGUAGES) {
    assert.deepEqual(Object.keys(TRANSLATIONS[code]).sort(), keys, code);
    for (const key of keys) {
      const message = TRANSLATIONS[code][key];
      assert.ok(message.trim().length > 0, `${code}.${key} is empty`);
      assert.deepEqual(placeholders(message), placeholders(TRANSLATIONS.en[key]), `${code}.${key}`);
    }
  }
});

test('score, level and cascade messages interpolate values in every language', () => {
  for (const { code } of LANGUAGES) {
    const score = translate(code, 'scoreEntry', { score: 2345, level: 12 });
    assert.ok(score.includes('2345') && score.includes('12'));
    assert.ok(!score.includes('{'));
    assert.ok(translate(code, 'levelUp', { level: 9 }).includes('9'));
    assert.ok(translate(code, 'cascade', { count: 3 }).includes('3'));
    assert.notEqual(translate(code, 'bombBlast'), translate(code, 'flashBlast'));
  }
});

test('an unsupported locale falls back to English', () => {
  assert.equal(translate('unknown', 'settings'), TRANSLATIONS.en.settings);
});
