import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import { createSnakeDataStore, type SnakeData, type SnakeDataStore } from './snakeDataStore';

type SnakeDataContextValue = SnakeData & Pick<SnakeDataStore, 'setDifficulty' | 'saveGame' | 'finishGame' | 'flush'> & { saveFailed: boolean };

const SnakeDataContext = createContext<SnakeDataContextValue | null>(null);

export function SnakeDataProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createSnakeDataStore(AsyncStorage));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    void store.load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void store.flush();
    });
    return () => {
      subscription.remove();
      void store.flush();
    };
  }, [store]);

  const value = useMemo(() => ({
    ...snapshot.data,
    saveFailed: snapshot.saveFailed,
    setDifficulty: store.setDifficulty,
    saveGame: store.saveGame,
    finishGame: store.finishGame,
    flush: store.flush,
  }), [snapshot, store]);

  return (
    <SnakeDataContext.Provider value={value}>
      {snapshot.ready ? children : <View style={styles.loading}><ActivityIndicator color="#A3E635" /></View>}
    </SnakeDataContext.Provider>
  );
}

export function useSnakeData() {
  const context = useContext(SnakeDataContext);
  if (!context) throw new Error('useSnakeData must be used inside SnakeDataProvider');
  return context;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#020412', alignItems: 'center', justifyContent: 'center' },
});
