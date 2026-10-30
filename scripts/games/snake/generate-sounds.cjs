const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');

const SAMPLE_RATE = 22050;
const tone = (frequency, seconds, gain = 0.24, endFrequency = frequency) =>
  ({ frequency, seconds, gain, endFrequency });

// Short original motifs with soft attacks keep repeated turns comfortable to hear.
const motifs = {
  start: [tone(329.63, 0.065), tone(440, 0.065), tone(659.25, 0.11)],
  eat: [tone(880, 0.09, 0.25, 1320)],
  turn: [tone(330, 0.04, 0.1, 392)],
  lose: [tone(392, 0.08), tone(293.66, 0.1), tone(196, 0.17)],
  win: [tone(440, 0.07), tone(554.37, 0.07), tone(659.25, 0.09), tone(880, 0.18)],
  bonus: [tone(1046.5, 0.04, 0.23), tone(1568, 0.05, 0.23), tone(2093, 0.08, 0.19)],
  level: [tone(523.25, 0.04, 0.2), tone(659.25, 0.04, 0.2), tone(880, 0.06, 0.22)],
};

function synthesize(notes) {
  const samples = notes.reduce((count, note) => count + Math.round(note.seconds * SAMPLE_RATE), 0);
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

function buildSnakeSounds() {
  return Object.fromEntries(Object.entries(motifs).map(([cue, notes]) => [cue, synthesize(notes)]));
}

module.exports = { buildSnakeSounds };

if (require.main === module) {
  const directory = path.join(path.dirname(module.filename), '..', '..', '..', 'assets', 'games', 'snake', 'sounds');
  fs.mkdirSync(directory, { recursive: true });
  const sounds = buildSnakeSounds();
  for (const [cue, buffer] of Object.entries(sounds)) fs.writeFileSync(path.join(directory, `${cue}.wav`), buffer);
  console.log(`Built ${Object.keys(sounds).length} Snake sound effects.`);
}
