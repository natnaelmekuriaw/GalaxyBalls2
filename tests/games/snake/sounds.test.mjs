import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { buildSnakeSounds } = require('../../../scripts/games/snake/generate-sounds.cjs');
const cues = ['start', 'eat', 'turn', 'lose', 'win'];

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
  assert.ok(bytes < 65536, 'The entire sound pack stays below 64 KB');
});
