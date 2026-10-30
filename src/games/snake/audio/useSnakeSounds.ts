import { createAudioPlayer, setAudioModeAsync, type AudioSource } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

export type SnakeSoundCue = 'start' | 'eat' | 'turn' | 'lose' | 'win' | 'bonus' | 'level';

const SOURCES: Record<SnakeSoundCue, AudioSource> = {
  start: require('@/assets/games/snake/sounds/start.wav'),
  eat: require('@/assets/games/snake/sounds/eat.wav'),
  turn: require('@/assets/games/snake/sounds/turn.wav'),
  lose: require('@/assets/games/snake/sounds/lose.wav'),
  win: require('@/assets/games/snake/sounds/win.wav'),
  bonus: require('@/assets/games/snake/sounds/bonus.wav'),
  level: require('@/assets/games/snake/sounds/level.wav'),
};

type Player = ReturnType<typeof createAudioPlayer>;

export function useSnakeSounds(enabled: boolean) {
  const playersRef = useRef<Partial<Record<SnakeSoundCue, Player>>>({});
  const enabledRef = useRef(enabled);
  const activeRef = useRef(false);
  const mountedRef = useRef(false);

  const stop = useCallback(() => {
    for (const player of Object.values(playersRef.current)) {
      try { player.pause(); } catch { /* A released player cannot continue playing. */ }
    }
  }, []);

  const play = useCallback((cue: SnakeSoundCue): boolean => {
    if (!mountedRef.current || !enabledRef.current || !activeRef.current) return false;
    const player = playersRef.current[cue];
    try {
      if (!player?.isLoaded) return false;
      if (cue === 'start' || cue === 'lose' || cue === 'win') stop();
      // Start within the input callback so browsers retain user interaction permission.
      void player.seekTo(0).catch(() => {});
      player.play();
      return true;
    } catch {
      return false;
    }
  }, [stop]);

  useEffect(() => {
    mountedRef.current = true;
    activeRef.current = AppState.currentState === null || AppState.currentState === 'active';
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});

    // Creating players after mount keeps static rendering silent.
    for (const cue of Object.keys(SOURCES) as SnakeSoundCue[]) {
      try {
        const player = createAudioPlayer(SOURCES[cue], { downloadFirst: true, updateInterval: 1000 });
        playersRef.current[cue] = player;
        player.volume = 0.5;
      } catch { /* An unavailable effect must not prevent the game from opening. */ }
    }

    const subscription = AppState.addEventListener('change', (state) => {
      activeRef.current = state === 'active';
      if (!activeRef.current) stop();
    });

    return () => {
      mountedRef.current = false;
      activeRef.current = false;
      subscription.remove();
      stop();
      for (const player of Object.values(playersRef.current)) {
        try { player.remove(); } catch { /* Continue releasing the other players. */ }
      }
      playersRef.current = {};
    };
  }, [stop]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) stop();
  }, [enabled, stop]);

  return useMemo(() => ({ play, stop }), [play, stop]);
}
