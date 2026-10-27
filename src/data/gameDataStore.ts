import type { ActivePiece, Cell, EngineState, GameConfig, GameMode, HighScoreEntry } from '../engine/galaxyEngine';
import type { Language } from '../i18n/translations';

export const GAME_DATA_KEY = '@galaxy-balls/game-data';

export interface GameData {
  version: 1;
  language: Language;
  soundsEnabled: boolean;
  menuMusicEnabled: boolean;
  highScores: Record<GameMode, HighScoreEntry[]>;
  currentGame: EngineState | null;
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
    currentGame: null,
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

function isInteger(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isConfig(value: unknown): value is GameConfig {
  if (!isRecord(value)) return false;
  return typeof value.mode === 'string' && ['CLASSIC', 'COMFORT', 'PRACTICE'].includes(value.mode)
    && isInteger(value.numColors, 1, 5)
    && isInteger(value.initialFallMs, 1, 60000) && isInteger(value.minFallMs, 1, value.initialFallMs)
    && isInteger(value.speedDecayPerLevel, 0, 60000) && isInteger(value.threeBlockUnlockLevel, 1)
    && typeof value.experimentalFourBlockPieces === 'boolean'
    && (value.rotationMode === 'GEOMETRY_90' || value.rotationMode === 'COLOR_CYCLE')
    && typeof value.allowHardDrop === 'boolean' && typeof value.showGhostPiece === 'boolean'
    && isInteger(value.bombRadius, 0, 6) && isInteger(value.maxConsecutiveHazards, 0, 100)
    && typeof value.stoneChanceBase === 'number' && value.stoneChanceBase >= 0 && value.stoneChanceBase <= 1
    && typeof value.specialChanceBase === 'number' && value.specialChanceBase >= 0 && value.specialChanceBase <= 1;
}

function isCell(value: unknown, numColors: number): value is Cell {
  if (!isRecord(value) || typeof value.kind !== 'string' || !['EMPTY', 'NORMAL', 'STONE', 'BOMB', 'FLASH', 'STAR'].includes(value.kind)) return false;
  return value.kind === 'NORMAL' ? isInteger(value.colorId, 0, numColors - 1)
    : value.colorId === undefined || isInteger(value.colorId, 0, numColors - 1);
}

function isPiece(value: unknown, config: GameConfig): value is ActivePiece {
  if (!isRecord(value) || !isInteger(value.x, 0, 5) || !isInteger(value.y, 0, 9)
    || !Array.isArray(value.cells) || value.cells.length < 1 || value.cells.length > 4
    || typeof value.isSingleSpecial !== 'boolean') return false;
  if (!value.cells.every((cell: unknown) => isRecord(cell) && isCell(cell, config.numColors)
    && cell.kind !== 'EMPTY' && isInteger(cell.dx, 0, 2) && isInteger(cell.dy, 0, 2))) return false;
  const piece = value as unknown as ActivePiece;
  const cells = piece.cells;
  if (cells.some((cell) => piece.x + cell.dx >= 6 || piece.y + cell.dy >= 10)) return false;
  if (new Set(cells.map(({ dx, dy }) => `${dx},${dy}`)).size !== cells.length) return false;
  if (Math.min(...cells.map(({ dx }) => dx)) !== 0 || Math.min(...cells.map(({ dy }) => dy)) !== 0) return false;
  if (piece.isSingleSpecial) return cells.length === 1 && ['BOMB', 'FLASH', 'STAR'].includes(cells[0].kind);
  if (cells.length < 2 || (cells.length === 4 && !config.experimentalFourBlockPieces)
    || cells.some(({ kind }) => kind !== 'NORMAL' && kind !== 'STONE')) return false;
  const connected = new Set([0]);
  for (let pass = 0; pass < cells.length; pass++) {
    cells.forEach((cell, index) => {
      if (cells.some((other, otherIndex) => connected.has(otherIndex)
        && Math.abs(cell.dx - other.dx) + Math.abs(cell.dy - other.dy) === 1)) connected.add(index);
    });
  }
  return connected.size === cells.length;
}

/** The save format uses the game's fixed 6 by 10 board and always restores paused. */
export function parseCurrentGame(value: unknown): EngineState | null {
  if (!isRecord(value) || (value.status !== 'PLAYING' && value.status !== 'PAUSED') || !isConfig(value.config)) return null;
  const config = value.config;
  if (!Array.isArray(value.grid) || value.grid.length !== 10
    || !value.grid.every((row: unknown) => Array.isArray(row) && row.length === 6 && row.every((cell) => isCell(cell, config.numColors)))) return null;
  if (!isPiece(value.activePiece, config) || !isPiece(value.nextPiece, config)
    || value.nextPiece.x !== 2 || value.nextPiece.y !== 0) return null;
  for (const key of ['score', 'piecesPlaced', 'linesOrMatchesCleared', 'lastChainDepth', 'consecutiveHazards']) {
    if (!isInteger(value[key])) return null;
  }
  if (!isInteger(value.level, 1) || !isInteger(value.seed, -2147483648, 2147483647)
    || !isInteger(value.mascotIndex, 0, 3)
    || typeof value.mascotMood !== 'string' || !['IDLE', 'HAPPY', 'COMBO', 'DANGER', 'TRANSITION'].includes(value.mascotMood)
    || (value.lastSpecialTriggered !== null && (typeof value.lastSpecialTriggered !== 'string' || !['BOMB', 'FLASH', 'STAR'].includes(value.lastSpecialTriggered)))) return null;
  const state = value as unknown as EngineState;
  if (state.activePiece!.cells.some(({ dx, dy }) => state.grid[state.activePiece!.y + dy][state.activePiece!.x + dx].kind !== 'EMPTY')) return null;
  return snapshotCurrentGame(state);
}

export function snapshotCurrentGame(state: EngineState): EngineState {
  const copyPiece = (piece: ActivePiece) => ({ ...piece, cells: piece.cells.map((cell) => ({ ...cell })) });
  return {
    ...state,
    status: 'PAUSED',
    config: { ...state.config },
    grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
    activePiece: state.activePiece ? copyPiece(state.activePiece) : null,
    nextPiece: copyPiece(state.nextPiece),
  };
}

function withHighScore(data: GameData, mode: GameMode, score: number, level: number, date: string): GameData {
  const entry = { alias: 'YOU', score, level, date };
  if (mode === 'PRACTICE' || score <= 0 || !isScoreEntry(entry)) return data;
  const previous = data.highScores[mode];
  const updated = [...previous, entry].sort((a, b) => b.score - a.score).slice(0, 5);
  if (updated.length === previous.length && updated.every((item, index) => item === previous[index])) return data;
  return { ...data, highScores: { ...data.highScores, [mode]: updated } };
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
  data.currentGame = parseCurrentGame(saved.currentGame);
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
          await storage.setItem(GAME_DATA_KEY, saving.payload);
          savedRevision = saving.revision;
          if (saving.revision === revision) setFailure(false);
        } catch {
          setFailure(true);
        }
      }
      writing = false;
    })();
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

export type GameDataStore = ReturnType<typeof createGameDataStore>;
