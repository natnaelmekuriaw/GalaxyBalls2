import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import { createGameDataStore, type GameData, type GameDataStore } from './gameDataStore';

type GameDataContextValue = GameData & Pick<GameDataStore,
  'setLanguage' | 'setSoundsEnabled' | 'setMenuMusicEnabled' | 'setHapticsEnabled' | 'setColorblindGlyphs' | 'setRotationMode' | 'recordHighScore' | 'saveCurrentGame' | 'finishGame'> & { saveFailed: boolean };

const GameDataContext = createContext<GameDataContextValue | null>(null);

export function GameDataProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createGameDataStore(AsyncStorage));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    void store.load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void store.flush();
    });
    return () => subscription.remove();
  }, [store]);

  const value = useMemo(() => ({
    ...snapshot.data,
    saveFailed: snapshot.saveFailed,
    setLanguage: store.setLanguage,
    setSoundsEnabled: store.setSoundsEnabled,
    setMenuMusicEnabled: store.setMenuMusicEnabled,
    setHapticsEnabled: store.setHapticsEnabled,
    setColorblindGlyphs: store.setColorblindGlyphs,
    setRotationMode: store.setRotationMode,
    recordHighScore: store.recordHighScore,
    saveCurrentGame: store.saveCurrentGame,
    finishGame: store.finishGame,
  }), [snapshot, store]);

  return (
    <GameDataContext.Provider value={value}>
      {snapshot.ready ? children : (
        <View style={styles.loading}><ActivityIndicator color="#FDE68A" /></View>
      )}
    </GameDataContext.Provider>
  );
}

export function useGameData() {
  const context = useContext(GameDataContext);
  if (!context) throw new Error('useGameData must be used inside GameDataProvider');
  return context;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#020412', justifyContent: 'center', alignItems: 'center' },
});
