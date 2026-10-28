import type { EngineState, GameConfig, GameMode } from '../games/galaxy-balls/engine/galaxyEngine';
import { createDefaultGalaxyBallsData, parseGalaxyBallsData, snapshotCurrentGame, withHighScore, type GalaxyBallsData } from '../games/galaxy-balls/data/galaxyBallsData.ts';
import { createDefaultAppPreferences, parseAppPreferences, type AppPreferences } from '../shared/preferences/appPreferences.ts';
import type { Language } from '../shared/i18n/translations';

// Keep the existing key and flat version-one format so installed saves remain compatible.
export const APP_DATA_KEY = '@galaxy-balls/game-data';

export interface AppData extends AppPreferences, GalaxyBallsData {
  version: 1;
}

export interface AppDataStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function createDefaultAppData(): AppData {
  return { version: 1, ...createDefaultAppPreferences(), ...createDefaultGalaxyBallsData() };
}

export function parseAppData(raw: string | null): AppData {
  const defaults = createDefaultAppData();
  if (raw === null) return defaults;
  let saved: unknown;
  try { saved = JSON.parse(raw); } catch { return defaults; }
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)
    || !('version' in saved) || saved.version !== 1) return defaults;
  return { version: 1, ...parseAppPreferences(saved as Record<string, unknown>), ...parseGalaxyBallsData(saved) };
}

/** One store owns hydration and serializes writes so an older save cannot finish last. */
export function createAppDataStore(storage: AppDataStorage) {
  let snapshot = { data: createDefaultAppData(), ready: false, saveFailed: false };
  const listeners = new Set<() => void>();
  let loading: Promise<void> | undefined;
  let writes = Promise.resolve();
  let writing = false;
  let pendingSave: { payload: string; revision: number } | null = null;
  let canWrite = false;
  let revision = 0;
  let savedRevision = 0;

  const notify = () => { for (const listener of listeners) listener(); };
  const setFailure = (saveFailed: boolean) => {
    if (snapshot.saveFailed === saveFailed) return;
    snapshot = { ...snapshot, saveFailed };
    notify();
  };
  const enqueueSave = () => {
    if (!canWrite) return;
    pendingSave = { payload: JSON.stringify(snapshot.data), revision };
    if (writing) return;
    writing = true;
    writes = (async () => {
      while (pendingSave) {
        const saving = pendingSave;
        pendingSave = null;
        try {
          await storage.setItem(APP_DATA_KEY, saving.payload);
          savedRevision = saving.revision;
          if (saving.revision === revision) setFailure(false);
        } catch {
          setFailure(true);
        }
      }
      writing = false;
    })();
  };
  const update = (data: AppData) => {
    if (!snapshot.ready || data === snapshot.data) return;
    snapshot = { ...snapshot, data };
    revision++;
    enqueueSave();
    notify();
  };
  const setPreference = <Key extends 'language' | 'soundsEnabled' | 'menuMusicEnabled' | 'hapticsEnabled' | 'colorblindGlyphs' | 'rotationMode'>(key: Key, value: AppData[Key]) => {
    if (snapshot.data[key] !== value) update({ ...snapshot.data, [key]: value });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load(): Promise<void> {
      if (!loading) {
        loading = (async () => {
          try {
            const data = parseAppData(await storage.getItem(APP_DATA_KEY));
            canWrite = true;
            snapshot = { data, ready: true, saveFailed: false };
          } catch {
            // Preserve unread data on disk; this session can still run in memory.
            snapshot = { ...snapshot, ready: true, saveFailed: true };
          }
          notify();
        })();
      }
      return loading;
    },
    setLanguage: (value: Language) => setPreference('language', value),
    setSoundsEnabled: (value: boolean) => setPreference('soundsEnabled', value),
    setMenuMusicEnabled: (value: boolean) => setPreference('menuMusicEnabled', value),
    setHapticsEnabled: (value: boolean) => setPreference('hapticsEnabled', value),
    setColorblindGlyphs: (value: boolean) => setPreference('colorblindGlyphs', value),
    setRotationMode: (value: GameConfig['rotationMode']) => setPreference('rotationMode', value),
    recordHighScore(mode: GameMode, score: number, level: number, date = new Date().toISOString().slice(0, 10)) {
      update(withHighScore(snapshot.data, mode, score, level, date));
    },
    saveCurrentGame(state: EngineState) {
      if ((state.status !== 'PLAYING' && state.status !== 'PAUSED') || !state.activePiece) return;
      update({ ...snapshot.data, currentGame: snapshotCurrentGame(state) });
    },
    finishGame(state: EngineState, date = new Date().toISOString().slice(0, 10)) {
      if (state.status !== 'GAME_OVER' || snapshot.data.currentGame === null) return;
      update({ ...withHighScore(snapshot.data, state.config.mode, state.score, state.level, date), currentGame: null });
    },
    async flush() {
      await writes;
      if (canWrite && savedRevision < revision) {
        enqueueSave();
        await writes;
      }
    },
  };
}

export type AppDataStore = ReturnType<typeof createAppDataStore>;
