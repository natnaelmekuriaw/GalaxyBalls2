const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');

const SAMPLE_RATE = 22050;
const tone = (frequency, seconds, gain = 0.24, endFrequency = frequency) =>
  ({ frequency, seconds, gain, endFrequency });

// Short original motifs with soft attacks keep repeated turns comfortable to hear.
const motifs = {
  start: [tone(329.63, 0.065), tone(440, 0.065), tone(659.25, 0.11)],
  turn: [tone(330, 0.04, 0.1, 392)],
  lose: [tone(392, 0.08), tone(293.66, 0.1), tone(196, 0.17)],
  win: [tone(440, 0.07), tone(554.37, 0.07), tone(659.25, 0.09), tone(880, 0.18)],
  bonus: [tone(1046.5, 0.04, 0.23), tone(1568, 0.05, 0.23), tone(2093, 0.08, 0.19)],
};

function createWaveBuffer(samples) {
  const output = Buffer.alloc(44 + samples * 2);
  output.write('RIFF', 0);
  output.writeUInt32LE(output.length - 8, 4);
  output.write('WAVEfmt ', 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24);
  output.writeUInt32LE(SAMPLE_RATE * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36);
  output.writeUInt32LE(samples * 2, 40);
  return output;
}

function synthesize(notes) {
  const samples = notes.reduce((count, note) => count + Math.round(note.seconds * SAMPLE_RATE), 0);
  const output = createWaveBuffer(samples);

  let offset = 44;
  for (const note of notes) {
    const length = Math.round(note.seconds * SAMPLE_RATE);
    for (let sample = 0; sample < length; sample++) {
      const time = sample / SAMPLE_RATE;
      const phase = 2 * Math.PI * (note.frequency * time
        + (note.endFrequency - note.frequency) * time * time / (2 * note.seconds));
      const wave = (Math.sin(phase) + 0.14 * Math.sin(2 * phase)) / 1.14;
      const envelope = Math.min(1, sample / (SAMPLE_RATE * 0.004))
        * Math.min(1, (length - 1 - sample) / (SAMPLE_RATE * 0.018));
      output.writeInt16LE(Math.round(wave * envelope * note.gain * 32767), offset);
      offset += 2;
    }
  }
  return output;
}

function layeredEffect(seconds, voices) {
  const samples = Math.round(seconds * SAMPLE_RATE);
  const output = createWaveBuffer(samples);
  for (let sample = 0; sample < samples; sample++) {
    const time = sample / SAMPLE_RATE;
    let value = 0;
    for (const voice of voices) {
      const elapsed = time - (voice.start ?? 0);
      if (elapsed < 0 || elapsed >= voice.seconds) continue;
      const phase = 2 * Math.PI * (voice.frequency * elapsed
        + ((voice.endFrequency ?? voice.frequency) - voice.frequency) * elapsed * elapsed / (2 * voice.seconds));
      const harmonic = voice.harmonic ?? 0.16;
      const wave = (Math.sin(phase) + harmonic * Math.sin(2 * phase)) / (1 + harmonic);
      const envelope = Math.min(1, elapsed / 0.003)
        * Math.exp(-elapsed / voice.decay)
        * Math.min(1, (voice.seconds - elapsed) / 0.024);
      value += wave * envelope * voice.gain;
    }
    // Fade the complete mix as well as each voice to keep either boundary click-free.
    const edge = Math.min(1, sample / (SAMPLE_RATE * 0.002))
      * Math.min(1, (samples - 1 - sample) / (SAMPLE_RATE * 0.012));
    output.writeInt16LE(Math.round(value * edge * 32767), 44 + sample * 2);
  }
  return output;
}

function berryPop() {
  // A rounded low pop, a plucked body, and a light droplet share one short envelope.
  return layeredEffect(0.155, [
    { frequency: 185, endFrequency: 92, seconds: 0.10, gain: 0.25, decay: 0.022, harmonic: 0.05 },
    { frequency: 760, endFrequency: 540, seconds: 0.15, gain: 0.28, decay: 0.045, harmonic: 0.22 },
    { frequency: 1180, endFrequency: 1568, start: 0.012, seconds: 0.13, gain: 0.13, decay: 0.035, harmonic: 0.10 },
  ]);
}

function levelFanfare() {
  // Leave the opening for the berry pop, then climb into a softly ringing major chord.
  return layeredEffect(0.62, [
    { frequency: 523.25, start: 0.045, seconds: 0.18, gain: 0.15, decay: 0.09 },
    { frequency: 659.25, start: 0.12, seconds: 0.20, gain: 0.15, decay: 0.095 },
    { frequency: 783.99, start: 0.195, seconds: 0.24, gain: 0.17, decay: 0.10 },
    { frequency: 1046.5, start: 0.285, seconds: 0.30, gain: 0.21, decay: 0.12 },
    { frequency: 523.25, start: 0.285, seconds: 0.32, gain: 0.065, decay: 0.16 },
    { frequency: 783.99, start: 0.285, seconds: 0.32, gain: 0.055, decay: 0.15 },
    { frequency: 1318.5, start: 0.34, seconds: 0.27, gain: 0.07, decay: 0.09 },
  ]);
}

function buildSnakeSounds() {
  return {
    start: synthesize(motifs.start),
    eat: berryPop(),
    turn: synthesize(motifs.turn),
    lose: synthesize(motifs.lose),
    win: synthesize(motifs.win),
    bonus: synthesize(motifs.bonus),
    level: levelFanfare(),
  };
}

module.exports = { buildSnakeSounds };

if (require.main === module) {
  const directory = path.join(path.dirname(module.filename), '..', '..', '..', 'assets', 'games', 'snake', 'sounds');
  fs.mkdirSync(directory, { recursive: true });
  const sounds = buildSnakeSounds();
  for (const [cue, buffer] of Object.entries(sounds)) fs.writeFileSync(path.join(directory, `${cue}.wav`), buffer);
  console.log(`Built ${Object.keys(sounds).length} Snake sound effects.`);
}
