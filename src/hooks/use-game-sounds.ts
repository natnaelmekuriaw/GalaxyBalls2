import { createAudioPlayer, setAudioModeAsync, type AudioSource } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { createSoundController, type SoundController, type SoundCue, type SoundPlayer } from '@/audio/soundController';

const SOURCES: Record<SoundCue, AudioSource> = {
  ui: require('../../assets/sounds/ui.wav'),
  start: require('../../assets/sounds/start.wav'),
  move: require('../../assets/sounds/move.wav'),
  rotate: require('../../assets/sounds/rotate.wav'),
  land: require('../../assets/sounds/land.wav'),
  stone: require('../../assets/sounds/stone.wav'),
  clear: require('../../assets/sounds/clear.wav'),
  cascade: require('../../assets/sounds/cascade.wav'),
  bomb: require('../../assets/sounds/bomb.wav'),
  flash: require('../../assets/sounds/flash.wav'),
  star: require('../../assets/sounds/star.wav'),
  win: require('../../assets/sounds/win.wav'),
  gameOver: require('../../assets/sounds/game-over.wav'),
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
