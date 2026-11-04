import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
const SOURCES = {
  roll: require('@/assets/games/ludo/sounds/roll.wav'), move: require('@/assets/games/ludo/sounds/move.wav'),
  capture: require('@/assets/games/ludo/sounds/capture.wav'), home: require('@/assets/games/ludo/sounds/home.wav'),
  win: require('@/assets/games/ludo/sounds/win.wav'), tap: require('@/assets/games/ludo/sounds/tap.wav'),
  start: require('@/assets/games/ludo/sounds/start.wav'), music: require('@/assets/games/ludo/sounds/music.wav'),
};
type Cue = Exclude<keyof typeof SOURCES, 'music'>;
type Player = ReturnType<typeof createAudioPlayer>;
export function useLudoAudio(sound: boolean, music: boolean, focused: boolean) {
  const players = useRef<Partial<Record<keyof typeof SOURCES, Player>>>({});
  const options = useRef({ sound, music, focused });
  const foreground = useRef(true);
  const unlocked = useRef(false);
  const stop = useCallback(() => { Object.values(players.current).forEach(player => { try { player.pause(); } catch {} }); }, []);
  const unlock = useCallback(() => {
    unlocked.current = true;
    const player = players.current.music;
    if (options.current.music && options.current.focused && foreground.current) { try { player?.play(); } catch {} }
  }, []);
  const play = useCallback((cue: Cue) => {
    if (!options.current.sound || !options.current.focused || !foreground.current) return;
    try { const player = players.current[cue]; void player?.seekTo(0).catch(() => {}); player?.play(); } catch {}
  }, []);
  useEffect(() => {
    foreground.current = AppState.currentState === null || AppState.currentState === 'active';
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    for (const key of Object.keys(SOURCES) as (keyof typeof SOURCES)[]) {
      try { const player = createAudioPlayer(SOURCES[key], { downloadFirst: true });
        player.volume = key === 'music' ? 0.3 : 0.65; player.loop = key === 'music'; players.current[key] = player; } catch {}
    }
    const listener = AppState.addEventListener('change', state => {
      foreground.current = state === 'active'; if (!foreground.current) stop(); else if (unlocked.current) unlock();
    });
    return () => { listener.remove(); stop(); Object.values(players.current).forEach(player => { try { player.remove(); } catch {} }); players.current = {}; };
  }, [stop, unlock]);
  useEffect(() => {
    options.current = { sound, music, focused };
    if (!sound) for (const [key, player] of Object.entries(players.current)) {
      if (key !== 'music') { try { player.pause(); } catch {} }
    }
    if (!focused) stop();
    else if (!music) { try { players.current.music?.pause(); } catch {} }
    else if (unlocked.current) unlock();
  }, [sound, music, focused, stop, unlock]);
  return { play, unlock };
}
