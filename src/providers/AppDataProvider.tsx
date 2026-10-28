import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import { createAppDataStore } from '@/data/appDataStore';
import { GalaxyBallsDataContext } from '@/games/galaxy-balls/data/GalaxyBallsDataContext';
import { AppPreferencesContext } from '@/shared/preferences/AppPreferencesContext';

export function AppDataProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createAppDataStore(AsyncStorage));
  const { data, ready, saveFailed } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    void store.load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void store.flush();
    });
    return () => subscription.remove();
  }, [store]);

  const preferences = useMemo(() => ({
    language: data.language,
    soundsEnabled: data.soundsEnabled,
    menuMusicEnabled: data.menuMusicEnabled,
    hapticsEnabled: data.hapticsEnabled,
    saveFailed,
    setLanguage: store.setLanguage,
    setSoundsEnabled: store.setSoundsEnabled,
    setMenuMusicEnabled: store.setMenuMusicEnabled,
    setHapticsEnabled: store.setHapticsEnabled,
  }), [data.language, data.soundsEnabled, data.menuMusicEnabled, data.hapticsEnabled, saveFailed, store]);

  const galaxyBalls = useMemo(() => ({
    colorblindGlyphs: data.colorblindGlyphs,
    rotationMode: data.rotationMode,
    highScores: data.highScores,
    currentGame: data.currentGame,
    saveFailed,
    setColorblindGlyphs: store.setColorblindGlyphs,
    setRotationMode: store.setRotationMode,
    recordHighScore: store.recordHighScore,
    saveCurrentGame: store.saveCurrentGame,
    finishGame: store.finishGame,
  }), [data.colorblindGlyphs, data.rotationMode, data.highScores, data.currentGame, saveFailed, store]);

  return (
    <AppPreferencesContext.Provider value={preferences}>
      <GalaxyBallsDataContext.Provider value={galaxyBalls}>
        {ready ? children : (
          <View style={styles.loading}><ActivityIndicator color="#FDE68A" /></View>
        )}
      </GalaxyBallsDataContext.Provider>
    </AppPreferencesContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#020412', justifyContent: 'center', alignItems: 'center' },
});
