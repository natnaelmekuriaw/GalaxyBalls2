"""Build the game's original soft synth score and short tactile effects."""
import math
import wave
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3] / 'assets/games/ludo/sounds'
ROOT.mkdir(parents=True, exist_ok=True)
RATE = 22050

def write(name, seconds, voices):
    data = []
    for i in range(int(seconds * RATE)):
        t = i / RATE
        sample = 0
        for start, duration, frequency, volume in voices:
            age = t - start
            if 0 <= age < duration:
                envelope = min(1, age / 0.008) * (1 - age / duration) ** 2
                sample += math.sin(2 * math.pi * frequency * age) * envelope * volume
        data.append(struct.pack('<h', int(max(-0.9, min(0.9, sample)) * 32767)))
    with wave.open(str(ROOT / (name + '.wav')), 'wb') as file:
        file.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        file.writeframes(b''.join(data))

write('roll', 0.42, [(i * 0.055, 0.06, 180 + i * 37, 0.4) for i in range(7)])
write('move', 0.16, [(0, 0.15, 480, 0.4), (0.03, 0.1, 720, 0.2)])
write('capture', 0.5, [(i * 0.075, 0.2, f, 0.3) for i, f in enumerate([660, 550, 440, 880])])
write('home', 0.65, [(i * 0.1, 0.25, f, 0.3) for i, f in enumerate([523, 659, 784, 1047])])
write('win', 1.5, [(i * 0.16, 0.45, f, 0.28) for i, f in enumerate([523, 659, 784, 1047, 784, 1047])])
write('tap', 0.09, [(0, 0.08, 820, 0.22)])
write('start', 0.6, [(i * 0.11, 0.2, f, 0.25) for i, f in enumerate([392, 523, 659, 784])])
notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23,
         246.94, 293.66, 392, 293.66, 261.63, 329.63, 392, 523.25]
voices = [(i * 0.5, 0.45, f, 0.12) for i, f in enumerate(notes * 2)]
voices += [(i * 2, 1.8, f, 0.1) for i, f in enumerate([130.81, 146.83, 123.47, 130.81] * 2)]
write('music', 16, voices)
