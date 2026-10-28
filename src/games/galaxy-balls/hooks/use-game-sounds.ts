import { createAudioPlayer, setAudioModeAsync, type AudioSource } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { createSoundController, type SoundController, type SoundCue, type SoundPlayer } from '@/games/galaxy-balls/audio/soundController';

const SOURCES: Record<SoundCue, AudioSource> = {
  ui: require('@/assets/games/galaxy-balls/sounds/ui.wav'),
  start: require('@/assets/games/galaxy-balls/sounds/start.wav'),
  move: require('@/assets/games/galaxy-balls/sounds/move.wav'),
  rotate: require('@/assets/games/galaxy-balls/sounds/rotate.wav'),
  land: require('@/assets/games/galaxy-balls/sounds/land.wav'),
  stone: require('@/assets/games/galaxy-balls/sounds/stone.wav'),
  clear: require('@/assets/games/galaxy-balls/sounds/clear.wav'),
  cascade: require('@/assets/games/galaxy-balls/sounds/cascade.wav'),
  bomb: require('@/assets/games/galaxy-balls/sounds/bomb.wav'),
  flash: require('@/assets/games/galaxy-balls/sounds/flash.wav'),
  star: require('@/assets/games/galaxy-balls/sounds/star.wav'),
  win: require('@/assets/games/galaxy-balls/sounds/win.wav'),
  gameOver: require('@/assets/games/galaxy-balls/sounds/game-over.wav'),
};

export function useGameSounds(enabled: boolean) {
  const controllerRef = useRef<SoundController | null>(null);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch((error) => {
      if (__DEV__) console.warn('Unable to configure game audio', error);
    });

    const players: Partial<Record<SoundCue, SoundPlayer>> = {};
    for (const cue of Object.keys(SOURCES) as SoundCue[]) {
      try {
        const player = createAudioPlayer(SOURCES[cue], { downloadFirst: true, updateInterval: 1000 });
        player.volume = 0.55;
        players[cue] = player;
      } catch (error) {
        if (__DEV__) console.warn(`Unable to load the ${cue} sound`, error);
      }
    }
    const controller = createSoundController(players);
    controller.setActive(AppState.currentState === null || AppState.currentState === 'active');
    controllerRef.current = controller;
    const subscription = AppState.addEventListener('change', (state) => {
      controller.setActive(state === 'active');
    });

    return () => {
      subscription.remove();
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setEnabled(enabled);
  }, [enabled]);

  const play = useCallback((cue: SoundCue) => controllerRef.current?.play(cue) ?? false, []);
  const playSequence = useCallback((cues: SoundCue[]) => controllerRef.current?.playSequence(cues), []);
  const stop = useCallback(() => controllerRef.current?.stop(), []);
  return { play, playSequence, stop };
}
