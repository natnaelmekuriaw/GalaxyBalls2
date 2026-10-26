const fs = require('node:fs');
const path = require('node:path');

const sampleRate = 22050;
const note = (frequency, duration, wave = 'square', gain = 0.3, endFrequency = frequency) =>
  ({ frequency, duration, wave, gain, endFrequency });

// Original short motifs and effects, synthesized as offline PCM WAV assets.
const effects = {
  ui: [note(660, 0.055, 'sine', 0.25)],
  start: [note(392, 0.07), note(523.25, 0.07), note(659.25, 0.07), note(784, 0.12)],
  move: [note(220, 0.045, 'square', 0.18)],
  rotate: [note(440, 0.04, 'triangle'), note(660, 0.055, 'triangle')],
  land: [note(150, 0.09, 'triangle', 0.35, 80)],
  stone: [note(85, 0.15, 'noise', 0.4, 40)],
  clear: [note(523.25, 0.055, 'triangle'), note(659.25, 0.055, 'triangle'), note(784, 0.08, 'triangle')],
  cascade: [note(523.25, 0.06), note(659.25, 0.06), note(784, 0.06), note(1046.5, 0.12)],
  bomb: [note(140, 0.3, 'noise', 0.45, 35)],
  flash: [note(1800, 0.19, 'square', 0.24, 250)],
  star: [note(784, 0.06, 'sine'), note(987.77, 0.06, 'sine'), note(1174.66, 0.06, 'sine'), note(1568, 0.16, 'sine')],
  levelUp: [note(392, 0.06), note(523.25, 0.06), note(659.25, 0.06), note(784, 0.06), note(1046.5, 0.18)],
  gameOver: [note(523.25, 0.09, 'triangle'), note(392, 0.09, 'triangle'), note(293.66, 0.09, 'triangle'), note(196, 0.2, 'triangle')],
};

function synthesize(notes) {
  const count = notes.reduce((sum, current) => sum + Math.round(current.duration * sampleRate), 0);
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);

  let offset = 44;
  let seed = 129831;
  for (const current of notes) {
    const length = Math.round(current.duration * sampleRate);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * (current.frequency * t +
        (current.endFrequency - current.frequency) * t * t / (2 * current.duration));
      const sine = Math.sin(phase);
      let value;
      if (current.wave === 'square') value = (sine + Math.sin(3 * phase) / 3 + Math.sin(5 * phase) / 5) / 1.54;
      else if (current.wave === 'triangle') value = 2 * Math.asin(sine) / Math.PI;
      else if (current.wave === 'noise') {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        value = 0.55 * sine + 0.45 * (seed / 2147483648 - 1);
      } else value = sine;
      const envelope = Math.min(1, t / 0.003) * Math.min(1, (length - 1 - i) / (sampleRate * 0.025));
      const decay = current.wave === 'noise' ? Math.exp(-5 * t / current.duration) : 1;
      buffer.writeInt16LE(Math.round(Math.max(-0.9, Math.min(0.9, value * envelope * decay * current.gain)) * 32767), offset);
      offset += 2;
    }
  }
  return buffer;
}

const directory = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(directory, { recursive: true });
for (const [cue, notes] of Object.entries(effects)) {
  const filename = cue.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  fs.writeFileSync(path.join(directory, `${filename}.wav`), synthesize(notes));
}
console.log(`Built ${Object.keys(effects).length} original sound effects.`);
