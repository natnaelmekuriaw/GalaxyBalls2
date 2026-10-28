import { createAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

export function useMenuMusic(enabled: boolean) {
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const [status, setStatus] = useState({ playing: false, isLoaded: false });
  const [requested, setRequested] = useState(Platform.OS !== 'web');
  const [active, setActive] = useState(AppState.currentState === null || AppState.currentState === 'active');

  useEffect(() => {
    // Audio handles are created after mount so static web rendering stays silent.
    const player = createAudioPlayer(require('@/assets/games/galaxy-balls/sounds/menu.wav'), { updateInterval: 1000 });
    player.loop = true;
    player.volume = 1;
    playerRef.current = player;
    const subscription = player.addListener('playbackStatusUpdate', (next) => {
      setStatus((previous) => previous.playing === next.playing && previous.isLoaded === next.isLoaded
        ? previous : { playing: next.playing, isLoaded: next.isLoaded });
    });
    return () => {
      subscription.remove();
      player.remove();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') playerRef.current?.pause();
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (enabled && active && requested && status.isLoaded) player.play();
    else player.pause();
  }, [enabled, active, requested, status.isLoaded]);

  const start = useCallback(() => {
    setRequested(true);
    if (enabled && active && playerRef.current?.isLoaded) playerRef.current.play();
  }, [enabled, active]);
  const stop = useCallback(() => playerRef.current?.pause(), []);

  return { start, stop, playing: status.playing, ready: status.isLoaded };
}
