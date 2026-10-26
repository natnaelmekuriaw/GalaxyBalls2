import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createSoundController, SOUND_CUES } from '../src/audio/soundController.ts';
import { getResolutionSounds } from '../src/audio/soundEvents.ts';
import { createNewGameState, lockActivePieceAndResolve } from '../src/engine/galaxyEngine.ts';

function fakePlayer() {
  const calls = [];
  return {
    isLoaded: true,
    duration: 0.1,
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

test('matches, specials, wins and losses keep distinct cues in their playback order', () => {
  const base = {
    clearedCount: 0, chainDepth: 0, scoreDelta: 0, stoneLanded: false,
    specialTriggered: null, levelUp: false, gameOver: false,
  };
  assert.deepEqual(getResolutionSounds(base), ['land']);
  assert.deepEqual(getResolutionSounds({ ...base, stoneLanded: true }), ['stone']);
  assert.deepEqual(getResolutionSounds({ ...base, clearedCount: 3 }), ['clear']);
  assert.deepEqual(getResolutionSounds({ ...base, clearedCount: 6, chainDepth: 2 }), ['cascade']);
  for (const kind of ['BOMB', 'FLASH', 'STAR']) {
    assert.deepEqual(getResolutionSounds({ ...base, specialTriggered: kind }), [kind.toLowerCase()]);
  }
  assert.deepEqual(getResolutionSounds({ ...base, clearedCount: 3, levelUp: true }), ['clear', 'win']);
  assert.deepEqual(getResolutionSounds({ ...base, specialTriggered: 'FLASH', chainDepth: 2, levelUp: true }), ['flash', 'cascade', 'win']);
  assert.deepEqual(getResolutionSounds({ ...base, levelUp: true, gameOver: true }), ['gameOver']);
});

test('a real matching clear plays its pop before a victory cue when the level advances', () => {
  for (const score of [0, 150]) {
    const state = createNewGameState('CLASSIC', {}, 123);
    state.score = score;
    state.grid[9][0] = { kind: 'NORMAL', colorId: 1 };
    state.grid[9][1] = { kind: 'NORMAL', colorId: 1 };
    state.activePiece = { x: 2, y: 9, cells: [{ dx: 0, dy: 0, kind: 'NORMAL', colorId: 1 }], isSingleSpecial: false };
    const summary = lockActivePieceAndResolve(state);
    assert.equal(summary.clearedCount, 3);
    assert.deepEqual(getResolutionSounds(summary), score === 150 ? ['clear', 'win'] : ['clear']);
  }
});

test('an actual blocked spawn selects the loss sound', () => {
  const state = createNewGameState('CLASSIC', {}, 123);
  for (const row of state.grid) for (const col of [2, 3, 4]) row[col] = { kind: 'STONE' };
  state.activePiece = { x: 0, y: 9, cells: [{ dx: 0, dy: 0, kind: 'NORMAL', colorId: 1 }], isSingleSpecial: false };
  const summary = lockActivePieceAndResolve(state);
  assert.equal(summary.gameOver, true);
  assert.deepEqual(getResolutionSounds(summary), ['gameOver']);
});

function fakeScheduler() {
  let id = 0;
  const jobs = new Map();
  return {
    jobs,
    set(callback, delay) { jobs.set(++id, { callback, delay }); return id; },
    clear(timer) { jobs.delete(timer); },
  };
}

test('a clear and victory play in sequence without masking the clear', () => {
  const clear = fakePlayer();
  const win = fakePlayer();
  const scheduler = fakeScheduler();
  const controller = createSoundController({ clear, win }, Date.now, scheduler);
  controller.setEnabled(true);
  controller.playSequence(['clear', 'win']);
  assert.ok(clear.calls.includes('play'));
  assert.deepEqual(win.calls, []);
  const job = [...scheduler.jobs.values()][0];
  assert.ok(job.delay >= clear.duration * 1000);
  job.callback();
  assert.ok(win.calls.includes('play'));
});

test('mute, stop, backgrounding and disposal cancel queued outcome sounds', () => {
  for (const action of ['mute', 'stop', 'background', 'dispose']) {
    const clear = fakePlayer();
    const win = fakePlayer();
    const scheduler = fakeScheduler();
    const controller = createSoundController({ clear, win }, Date.now, scheduler);
    controller.setEnabled(true);
    controller.playSequence(['clear', 'win']);
    if (action === 'mute') controller.setEnabled(false);
    if (action === 'stop') controller.stop();
    if (action === 'background') controller.setActive(false);
    if (action === 'dispose') controller.dispose();
    assert.equal(scheduler.jobs.size, 0, action);
    assert.ok(!win.calls.includes('play'), action);
  }
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

test('the bundled menu theme is a complete, non-silent loop kept below 250 KB', () => {
  const data = readFileSync(new URL('../assets/sounds/menu.wav', import.meta.url));
  assert.equal(data.toString('ascii', 0, 4), 'RIFF');
  assert.equal(data.readUInt32LE(40), data.length - 44);
  assert.ok(data.length > 44044 && data.length < 250000);
  assert.equal(data.readInt16LE(44), 0);
  assert.equal(data.readInt16LE(data.length - 2), 0);
  assert.ok(data.subarray(44).some((sample) => sample !== 0));
});
