import { getSnakeMaxScore, pauseSnake, restoreSnakeGame, SNAKE_DIFFICULTIES, SNAKE_MODES, type SnakeDifficulty, type SnakeMode, type SnakeState } from '../engine/snakeEngine.ts';

export const SNAKE_DATA_KEY = '@snake/game-data';

export interface SnakeData {
  version: 1;
  bestScores: Record<SnakeDifficulty, number>;
  arcadeBestScores: Record<SnakeDifficulty, number>;
  currentGame: SnakeState | null;
  lastDifficulty: SnakeDifficulty;
  lastMode: SnakeMode;
}

export interface SnakeDataStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function createDefaultSnakeData(): SnakeData {
  return {
    version: 1,
    bestScores: { EASY: 0, NORMAL: 0, FAST: 0 },
    arcadeBestScores: { EASY: 0, NORMAL: 0, FAST: 0 },
    currentGame: null,
    lastDifficulty: 'NORMAL',
    lastMode: 'ARCADE',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDifficulty(value: unknown): value is SnakeDifficulty {
  return typeof value === 'string' && SNAKE_DIFFICULTIES.some((difficulty) => difficulty === value);
}

function isMode(value: unknown): value is SnakeMode {
  return typeof value === 'string' && SNAKE_MODES.some((mode) => mode === value);
}

function isScore(value: unknown, mode: SnakeMode): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    && value >= 0 && value <= getSnakeMaxScore(mode) && value % 10 === 0;
}

const scoresKey = (mode: SnakeMode) => mode === 'ARCADE' ? 'arcadeBestScores' : 'bestScores';

function withBestScore(bestScores: SnakeData['bestScores'], difficulty: SnakeDifficulty, score: number) {
  return score > bestScores[difficulty] ? { ...bestScores, [difficulty]: score } : bestScores;
}

export function parseSnakeData(raw: string | null): SnakeData {
  const data = createDefaultSnakeData();
  if (raw === null) return data;
  let saved: unknown;
  try { saved = JSON.parse(raw); } catch { return data; }
  if (!isRecord(saved) || saved.version !== 1) return data;
  if (isDifficulty(saved.lastDifficulty)) data.lastDifficulty = saved.lastDifficulty;
  for (const mode of SNAKE_MODES) {
    const key = scoresKey(mode);
    const scores = saved[key];
    if (isRecord(scores)) {
      for (const difficulty of SNAKE_DIFFICULTIES) {
        const score = scores[difficulty];
        if (isScore(score, mode)) data[key][difficulty] = score;
      }
    }
  }
  data.currentGame = restoreSnakeGame(saved.currentGame);
  data.lastMode = isMode(saved.lastMode) ? saved.lastMode : data.currentGame?.mode ?? 'CLASSIC';
  if (data.currentGame) {
    const key = scoresKey(data.currentGame.mode);
    data[key] = withBestScore(data[key], data.currentGame.difficulty, data.currentGame.score);
  }
  return data;
}

/** This store owns only Snake's key and keeps the newest pending checkpoint. */
export function createSnakeDataStore(storage: SnakeDataStorage) {
  let snapshot = { data: createDefaultSnakeData(), ready: false, saveFailed: false };
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
          await storage.setItem(SNAKE_DATA_KEY, saving.payload);
          savedRevision = saving.revision;
          if (saving.revision === revision) setFailure(false);
        } catch {
          setFailure(true);
        }
      }
      writing = false;
    })();
  };
  const update = (data: SnakeData) => {
    if (!snapshot.ready || data === snapshot.data) return;
    snapshot = { ...snapshot, data };
    revision++;
    enqueueSave();
    notify();
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
            const data = parseSnakeData(await storage.getItem(SNAKE_DATA_KEY));
            canWrite = true;
            snapshot = { data, ready: true, saveFailed: false };
          } catch {
            // A failed read must not replace an existing save with defaults.
            snapshot = { ...snapshot, ready: true, saveFailed: true };
          }
          notify();
        })();
      }
      return loading;
    },
    setDifficulty(difficulty: SnakeDifficulty) {
      if (isDifficulty(difficulty) && snapshot.data.lastDifficulty !== difficulty) {
        update({ ...snapshot.data, lastDifficulty: difficulty });
      }
    },
    setMode(mode: SnakeMode) {
      if (isMode(mode) && snapshot.data.lastMode !== mode) {
        update({ ...snapshot.data, lastMode: mode });
      }
    },
    saveGame(state: SnakeState) {
      if (state.status !== 'PLAYING' && state.status !== 'PAUSED') return;
      const currentGame = restoreSnakeGame(pauseSnake(state));
      if (!currentGame) return;
      const key = scoresKey(currentGame.mode);
      update({
        ...snapshot.data,
        [key]: withBestScore(snapshot.data[key], currentGame.difficulty, currentGame.score),
        currentGame,
        lastDifficulty: currentGame.difficulty,
        lastMode: currentGame.mode,
      });
    },
    finishGame(state: SnakeState) {
      if ((state.status !== 'GAME_OVER' && state.status !== 'WON') || !isDifficulty(state.difficulty)
        || !isMode(state.mode) || !isScore(state.score, state.mode)) return;
      const key = scoresKey(state.mode);
      const scores = withBestScore(snapshot.data[key], state.difficulty, state.score);
      if (snapshot.data.currentGame === null && scores === snapshot.data[key]
        && snapshot.data.lastDifficulty === state.difficulty && snapshot.data.lastMode === state.mode) return;
      update({ ...snapshot.data, [key]: scores, currentGame: null, lastDifficulty: state.difficulty, lastMode: state.mode });
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

export type SnakeDataStore = ReturnType<typeof createSnakeDataStore>;
