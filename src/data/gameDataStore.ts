import type { GameMode, HighScoreEntry } from '../engine/galaxyEngine';
import type { Language } from '../i18n/translations';

export const GAME_DATA_KEY = '@galaxy-balls/game-data';

export interface GameData {
  version: 1;
  language: Language;
  soundsEnabled: boolean;
  menuMusicEnabled: boolean;
  highScores: Record<GameMode, HighScoreEntry[]>;
}

export interface GameDataStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function createDefaultGameData(): GameData {
  return {
    version: 1,
    language: 'en',
    soundsEnabled: true,
    menuMusicEnabled: true,
    highScores: {
      CLASSIC: [
        { alias: 'NOK', score: 90, level: 1, date: '2026-10-14' },
        { alias: 'ORB', score: 60, level: 1, date: '2026-10-14' },
        { alias: 'GAL', score: 30, level: 1, date: '2026-10-14' },
      ],
      COMFORT: [
        { alias: 'MOD', score: 180, level: 2, date: '2026-10-14' },
        { alias: 'ZEN', score: 90, level: 1, date: '2026-10-14' },
      ],
      PRACTICE: [],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScoreEntry(value: unknown): value is HighScoreEntry {
  if (!isRecord(value)) return false;
  return typeof value.alias === 'string' && value.alias.trim().length > 0 && value.alias.length <= 16
    && typeof value.score === 'number' && Number.isSafeInteger(value.score) && value.score >= 0
    && typeof value.level === 'number' && Number.isSafeInteger(value.level) && value.level >= 1
    && typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && Number.isFinite(Date.parse(value.date))
    && new Date(value.date).toISOString().slice(0, 10) === value.date;
}

export function parseGameData(raw: string | null): GameData {
  const data = createDefaultGameData();
  if (raw === null) return data;
  let saved: unknown;
  try { saved = JSON.parse(raw); } catch { return data; }
  if (!isRecord(saved) || saved.version !== 1) return data;
  if (saved.language === 'en' || saved.language === 'am' || saved.language === 'om') data.language = saved.language;
  if (typeof saved.soundsEnabled === 'boolean') data.soundsEnabled = saved.soundsEnabled;
  if (typeof saved.menuMusicEnabled === 'boolean') data.menuMusicEnabled = saved.menuMusicEnabled;
  if (isRecord(saved.highScores)) {
    for (const mode of ['CLASSIC', 'COMFORT'] as const) {
      const entries = saved.highScores[mode];
      if (Array.isArray(entries)) {
        data.highScores[mode] = entries.filter(isScoreEntry)
          .map(({ alias, score, level, date }) => ({ alias: alias.trim(), score, level, date }))
          .sort((a, b) => b.score - a.score).slice(0, 5);
      }
    }
  }
  return data;
}

/** One store owns hydration and serializes writes so an older save cannot finish last. */
export function createGameDataStore(storage: GameDataStorage) {
  let snapshot = { data: createDefaultGameData(), ready: false, saveFailed: false };
  const listeners = new Set<() => void>();
  let loading: Promise<void> | undefined;
  let writes = Promise.resolve();
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
    const payload = JSON.stringify(snapshot.data);
    const savingRevision = revision;
    writes = writes.then(async () => {
      try {
        await storage.setItem(GAME_DATA_KEY, payload);
        savedRevision = savingRevision;
        if (savingRevision === revision) setFailure(false);
      } catch {
        setFailure(true);
      }
    });
  };
  const update = (data: GameData) => {
    if (!snapshot.ready || data === snapshot.data) return;
    snapshot = { ...snapshot, data };
    revision++;
    enqueueSave();
    notify();
  };
  const setPreference = <Key extends 'language' | 'soundsEnabled' | 'menuMusicEnabled'>(key: Key, value: GameData[Key]) => {
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
            const data = parseGameData(await storage.getItem(GAME_DATA_KEY));
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
    recordHighScore(mode: GameMode, score: number, level: number, date = new Date().toISOString().slice(0, 10)) {
      const entry = { alias: 'YOU', score, level, date };
      if (mode === 'PRACTICE' || score <= 0 || !isScoreEntry(entry)) return;
      const previous = snapshot.data.highScores[mode];
      const updated = [...previous, entry].sort((a, b) => b.score - a.score).slice(0, 5);
      if (updated.length === previous.length && updated.every((item, index) => item === previous[index])) return;
      update({ ...snapshot.data, highScores: { ...snapshot.data.highScores, [mode]: updated } });
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

export type GameDataStore = ReturnType<typeof createGameDataStore>;
