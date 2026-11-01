import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { OrientationLock, PlatformOrientationInfo } from 'expo-screen-orientation';

import { createOrientationManager, initialOrientationState, type SnakeOrientation } from '../controls/orientation';

type PreviousLock = { lock: OrientationLock; platform?: PlatformOrientationInfo };
const loadOrientation = () => import('expo-screen-orientation');

const orientationManager = createOrientationManager<PreviousLock>({
  async capture() {
    const api = await loadOrientation();
    const lock = await api.getOrientationLockAsync();
    const platform = lock === api.OrientationLock.OTHER || lock === api.OrientationLock.UNKNOWN
      ? await api.getPlatformOrientationLockAsync() : undefined;
    return { lock, platform };
  },
  async supports(mode) {
    const api = await loadOrientation();
    const lock = mode === 'LANDSCAPE' ? api.OrientationLock.LANDSCAPE
      : mode === 'PORTRAIT' ? api.OrientationLock.PORTRAIT_UP : api.OrientationLock.DEFAULT;
    return api.supportsOrientationLockAsync(lock);
  },
  async apply(mode) {
    const api = await loadOrientation();
    if (mode === 'AUTO') await api.unlockAsync();
    else await api.lockAsync(mode === 'LANDSCAPE' ? api.OrientationLock.LANDSCAPE : api.OrientationLock.PORTRAIT_UP);
  },
  async restore(previous) {
    const api = await loadOrientation();
    try {
      if (previous.platform) await api.lockPlatformAsync(previous.platform);
      else if (previous.lock === api.OrientationLock.DEFAULT) await api.unlockAsync();
      else await api.lockAsync(previous.lock);
    } catch {
      // If a previous policy is no longer available, release this game's lock.
      await api.unlockAsync();
    }
  },
});

/** Native requests stay local to the focused Snake screen; layout still follows window size. */
export function useSnakeOrientation(focused: boolean) {
  const [state, setState] = useState(initialOrientationState);
  const session = useMemo(() => orientationManager.createSession(setState), []);
  useEffect(() => {
    if (Platform.OS === 'web' || !focused) return;
    session.enter();
    return () => session.leave();
  }, [focused, session]);

  const changeOrientation = useCallback((mode: SnakeOrientation): Promise<boolean> => {
    if (Platform.OS === 'web') {
      // Browser orientation locks often require fullscreen and are unavailable on desktop.
      setState(previous => ({ ...previous, busy: false, unavailable: true }));
      return Promise.resolve(false);
    }
    return session.changeOrientation(mode);
  }, [session]);
  return { ...state, changeOrientation };
}
