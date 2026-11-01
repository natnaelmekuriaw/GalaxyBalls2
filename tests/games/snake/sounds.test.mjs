import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { buildSnakeSounds } = require('../../../scripts/games/snake/generate-sounds.cjs');
const cues = ['start', 'eat', 'turn', 'lose', 'win', 'bonus', 'level'];

test('Snake sound assets match their deterministic generator and contain valid short PCM audio', () => {
  const sounds = buildSnakeSounds();
  assert.deepEqual(Object.keys(sounds), cues);
  for (const cue of cues) {
    const wav = readFileSync(new URL(`../../../assets/games/snake/sounds/${cue}.wav`, import.meta.url));
    assert.deepEqual(wav, sounds[cue], cue);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF', cue);
    assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ', cue);
    assert.equal(wav.toString('ascii', 36, 40), 'data', cue);
    assert.equal(wav.readUInt32LE(4), wav.length - 8, cue);
    assert.equal(wav.readUInt16LE(20), 1, `${cue}: PCM`);
    assert.equal(wav.readUInt16LE(22), 1, `${cue}: mono`);
    assert.equal(wav.readUInt32LE(24), 22050, `${cue}: sample rate`);
    assert.equal(wav.readUInt16LE(34), 16, `${cue}: bit depth`);
    assert.equal(wav.readUInt32LE(40), wav.length - 44, `${cue}: complete samples`);
    const seconds = (wav.length - 44) / 44100;
    assert.ok(seconds > 0.02 && seconds < 0.8, `${cue}: short effect`);
  }
});

test('Snake effects are audible, unclipped, distinct, and small enough to bundle offline', () => {
  const sounds = buildSnakeSounds();
  const hashes = new Set();
  let bytes = 0;
  for (const [cue, wav] of Object.entries(sounds)) {
    let peak = 0;
    for (let offset = 44; offset < wav.length; offset += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(offset)));
    assert.ok(peak > 300 && peak < 32767, `${cue}: audible without clipping`);
    assert.equal(wav.readInt16LE(44), 0, `${cue}: silent attack`);
    assert.equal(wav.readInt16LE(wav.length - 2), 0, `${cue}: silent tail`);
    hashes.add(createHash('sha256').update(wav).digest('hex'));
    bytes += wav.length;
  }
  assert.equal(hashes.size, cues.length);
  assert.ok(bytes < 98304, 'The entire sound pack stays below 96 KB');
});

test('the berry reward is brief and the level reward leaves space for its pickup', () => {
  const { eat, level } = buildSnakeSounds();
  const duration = wav => (wav.length - 44) / 44100;
  assert.ok(duration(eat) >= 0.12 && duration(eat) <= 0.18, 'A pickup stays quick enough for repeated fruit');
  assert.ok(duration(level) >= 0.45 && duration(level) <= 0.65, 'The milestone gets a distinct musical reward');
  let openingPeak = 0;
  for (let sample = 0; sample < 0.035 * 22050; sample++) {
    openingPeak = Math.max(openingPeak, Math.abs(level.readInt16LE(44 + sample * 2)));
  }
  assert.equal(openingPeak, 0, 'The level fanfare lets the simultaneous berry pop speak first');
  let mixedPeak = 0;
  for (let offset = 44; offset < level.length; offset += 2) {
    const pickup = offset < eat.length ? eat.readInt16LE(offset) : 0;
    mixedPeak = Math.max(mixedPeak, Math.abs(pickup + level.readInt16LE(offset)));
  }
  assert.ok(mixedPeak < 32767, 'Playing the pickup and fanfare together leaves mixing headroom');
});
