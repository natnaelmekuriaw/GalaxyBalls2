import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
test('bundled effects and loop are valid, audible mono PCM files with safe peaks', async () => {
  for (const cue of ['roll', 'move', 'capture', 'home', 'win', 'tap', 'start', 'music']) {
    const data = await readFile(new URL(`../../../assets/games/ludo/sounds/${cue}.wav`, import.meta.url));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WAVE');
    assert.equal(data.readUInt16LE(22), 1);
    assert.equal(data.readUInt32LE(24), 22050);
    assert.equal(data.readUInt16LE(34), 16);
    let peak = 0;
    for (let i = 44; i + 1 < data.length; i += 2) peak = Math.max(peak, Math.abs(data.readInt16LE(i)));
    assert.ok(peak > 1000 && peak < 32767, `${cue}: invalid audio peak`);
    assert.ok(data.length > 2000);
  }
});
