export const SOUND_CUES = [
  'ui', 'start', 'move', 'rotate', 'land', 'stone', 'clear',
  'cascade', 'bomb', 'flash', 'star', 'levelUp', 'gameOver',
] as const;

export type SoundCue = (typeof SOUND_CUES)[number];

export interface SoundPlayer {
  readonly isLoaded: boolean;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  remove(): void;
}

/** Keep replay, mute, and lifecycle rules independent of the audio platform. */
export function createSoundController(
  players: Partial<Record<SoundCue, SoundPlayer>>,
  now: () => number = Date.now,
) {
  let enabled = false;
  let active = true;
  let disposed = false;
  const lastPlayed = new Map<SoundCue, number>();

  const stop = () => {
    lastPlayed.clear();
    for (const player of Object.values(players)) {
      try { player.pause(); } catch { /* A released player cannot keep playing. */ }
    }
  };

  return {
    play(cue: SoundCue): boolean {
      const player = players[cue];
      if (disposed || !enabled || !active || !player?.isLoaded) return false;
      const timestamp = now();
      if (cue === 'move' && timestamp - (lastPlayed.get(cue) ?? -Infinity) < 45) return false;
      try {
        // Start synchronously to retain the browser's user interaction permission.
        void player.seekTo(0).catch(() => {});
        player.play();
        lastPlayed.set(cue, timestamp);
        return true;
      } catch {
        return false;
      }
    },
    stop,
    setEnabled(value: boolean) {
      enabled = value;
      if (!enabled) stop();
    },
    setActive(value: boolean) {
      active = value;
      if (!active) stop();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      for (const player of Object.values(players)) {
        try { player.remove(); } catch { /* Cleanup must not interrupt navigation. */ }
      }
    },
  };
}

export type SoundController = ReturnType<typeof createSoundController>;
