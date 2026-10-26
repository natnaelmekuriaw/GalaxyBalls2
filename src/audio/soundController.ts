export const SOUND_CUES = [
  'ui', 'start', 'move', 'rotate', 'land', 'stone', 'clear',
  'cascade', 'bomb', 'flash', 'star', 'win', 'gameOver',
] as const;

export type SoundCue = (typeof SOUND_CUES)[number];

export interface SoundPlayer {
  readonly isLoaded: boolean;
  readonly duration?: number;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  remove(): void;
}

/** Keep replay, mute, and lifecycle rules independent of the audio platform. */
export function createSoundController(
  players: Partial<Record<SoundCue, SoundPlayer>>,
  now: () => number = Date.now,
  scheduler: {
    set: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
    clear: (timer: ReturnType<typeof setTimeout>) => void;
  } = { set: setTimeout, clear: clearTimeout },
) {
  let enabled = false;
  let active = true;
  let disposed = false;
  const lastPlayed = new Map<SoundCue, number>();
  const pending = new Set<ReturnType<typeof setTimeout>>();

  const cancelSequence = () => {
    for (const timer of pending) scheduler.clear(timer);
    pending.clear();
  };

  const stop = () => {
    cancelSequence();
    lastPlayed.clear();
    for (const player of Object.values(players)) {
      try { player.pause(); } catch { /* A released player cannot keep playing. */ }
    }
  };

  const play = (cue: SoundCue): boolean => {
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
  };

  return {
    play,
    playSequence(cues: SoundCue[]) {
      cancelSequence();
      if (disposed || !enabled || !active) return;
      let delay = 0;
      for (const cue of cues) {
        if (delay === 0) play(cue);
        else {
          const timer = scheduler.set(() => {
            pending.delete(timer);
            play(cue);
          }, delay);
          pending.add(timer);
        }
        delay += Math.max(80, (players[cue]?.duration || 0.18) * 1000) + 25;
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
