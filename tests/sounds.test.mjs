import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createSoundController, SOUND_CUES } from '../src/audio/soundController.ts';
import { getResolutionSound } from '../src/audio/soundEvents.ts';

function fakePlayer() {
  const calls = [];
  return {
    isLoaded: true,
    calls,
    play() { calls.push('play'); },
    pause() { calls.push('pause'); },
    seekTo(seconds) { calls.push(['seek', seconds]); return Promise.resolve(); },
    remove() { calls.push('remove'); },
  };
}

test('mute stops playback immediately and prevents new effects until enabled', () => {
  const player = fakePlayer();
  const controller = createSoundController({ clear: player });
  assert.equal(controller.play('clear'), false);
  controller.setEnabled(true);
  assert.equal(controller.play('clear'), true);
  assert.deepEqual(player.calls.slice(0, 2), [['seek', 0], 'play']);
  controller.setEnabled(false);
  assert.equal(player.calls.at(-1), 'pause');
  assert.equal(controller.play('clear'), false);
  controller.setEnabled(true);
  assert.equal(controller.play('clear'), true);
});

test('backgrounding stops effects and foregrounding never resumes an old effect', () => {
  const player = fakePlayer();
  const controller = createSoundController({ bomb: player });
  controller.setEnabled(true);
  controller.play('bomb');
  controller.setActive(false);
  assert.equal(player.calls.at(-1), 'pause');
  assert.equal(controller.play('bomb'), false);
  controller.setActive(true);
  assert.equal(player.calls.filter((call) => call === 'play').length, 1);
  assert.equal(controller.play('bomb'), true);
});

test('effects restart from zero and repeated movement ticks are limited', () => {
  const player = fakePlayer();
  let time = 0;
  const controller = createSoundController({ move: player }, () => time);
  controller.setEnabled(true);
  assert.equal(controller.play('move'), true);
  time = 20;
  assert.equal(controller.play('move'), false);
  time = 60;
  assert.equal(controller.play('move'), true);
  assert.deepEqual(player.calls, [['seek', 0], 'play', ['seek', 0], 'play']);
});

test('unloaded effects are skipped and disposal releases every player exactly once', () => {
  const loaded = fakePlayer();
  const unloaded = fakePlayer();
  unloaded.isLoaded = false;
  const controller = createSoundController({ clear: loaded, star: unloaded });
  controller.setEnabled(true);
  assert.equal(controller.play('star'), false);
  assert.deepEqual(unloaded.calls, []);
  controller.dispose();
  controller.dispose();
  assert.equal(controller.play('clear'), false);
  for (const player of [loaded, unloaded]) {
    assert.equal(player.calls.filter((call) => call === 'remove').length, 1);
    assert.ok(player.calls.indexOf('pause') < player.calls.indexOf('remove'));
  }
});

test('failed audio playback does not throw into the game loop', async () => {
  const player = fakePlayer();
  player.play = () => { throw new Error('Audio unavailable'); };
  player.seekTo = () => Promise.reject(new Error('Seek unavailable'));
  const controller = createSoundController({ clear: player });
  controller.setEnabled(true);
  assert.equal(controller.play('clear'), false);
  await Promise.resolve();
});

test('lock events choose the correct sound, with game over and level up taking priority', () => {
  const base = {
    clearedCount: 0, chainDepth: 0, scoreDelta: 0, stoneLanded: false,
    specialTriggered: null, levelUp: false, gameOver: false,
  };
  assert.equal(getResolutionSound(base), 'land');
  assert.equal(getResolutionSound({ ...base, stoneLanded: true }), 'stone');
  assert.equal(getResolutionSound({ ...base, clearedCount: 3 }), 'clear');
  assert.equal(getResolutionSound({ ...base, clearedCount: 6, chainDepth: 2 }), 'cascade');
  for (const kind of ['BOMB', 'FLASH', 'STAR']) {
    assert.equal(getResolutionSound({ ...base, specialTriggered: kind }), kind.toLowerCase());
  }
  assert.equal(getResolutionSound({ ...base, clearedCount: 3, levelUp: true }), 'levelUp');
  assert.equal(getResolutionSound({ ...base, levelUp: true, gameOver: true }), 'gameOver');
});

test('every shipped effect is a short, non-silent, unclipped PCM WAV', () => {
  let totalBytes = 0;
  for (const cue of SOUND_CUES) {
    const filename = cue.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const data = readFileSync(new URL(`../assets/sounds/${filename}.wav`, import.meta.url));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', cue);
    assert.equal(data.toString('ascii', 8, 16), 'WAVEfmt ', cue);
    assert.equal(data.readUInt16LE(20), 1, `${cue}: PCM`);
    assert.equal(data.readUInt16LE(22), 1, `${cue}: mono`);
    assert.equal(data.readUInt32LE(24), 22050, `${cue}: sample rate`);
    assert.equal(data.readUInt16LE(34), 16, `${cue}: bit depth`);
    assert.equal(data.readUInt32LE(40), data.length - 44, `${cue}: complete samples`);
    const duration = (data.length - 44) / (22050 * 2);
    assert.ok(duration > 0.02 && duration < 1, `${cue}: short effect`);
    let peak = 0;
    for (let offset = 44; offset < data.length; offset += 2) peak = Math.max(peak, Math.abs(data.readInt16LE(offset)));
    assert.ok(peak > 300 && peak < 32767, `${cue}: audible without clipping`);
    totalBytes += data.length;
  }
  assert.ok(totalBytes < 150000, 'Sound pack must remain small enough to bundle offline');
});
