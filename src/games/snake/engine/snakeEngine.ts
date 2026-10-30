export const SNAKE_COLS = 18;
export const SNAKE_ROWS = 18;
export const SNAKE_DIFFICULTIES = ['EASY', 'NORMAL', 'FAST'] as const;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type SnakeDifficulty = (typeof SNAKE_DIFFICULTIES)[number];
export type Point = { x: number; y: number };
export type SnakeState = {
  body: Point[];
  direction: Direction;
  turnQueue: Direction[];
  food: Point | null;
  score: number;
  difficulty: SnakeDifficulty;
  status: 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'WON';
  seed: number;
};

const INITIAL_LENGTH = 4;
const POINTS_PER_FOOD = 10;
const BOARD_SIZE = SNAKE_COLS * SNAKE_ROWS;
const BASE_TICK_MS: Record<SnakeDifficulty, number> = { EASY: 220, NORMAL: 160, FAST: 110 };
const VECTOR: Record<Direction, Point> = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

const samePoint = (first: Point, second: Point) => first.x === second.x && first.y === second.y;
const pointIndex = ({ x, y }: Point) => y * SNAKE_COLS + x;

function placeFood(body: Point[], seed: number): { food: Point | null; seed: number } {
  if (body.length === BOARD_SIZE) return { food: null, seed };
  const occupied = new Set(body.map(pointIndex));
  const free: Point[] = [];
  for (let y = 0; y < SNAKE_ROWS; y++) {
    for (let x = 0; x < SNAKE_COLS; x++) {
      if (!occupied.has(y * SNAKE_COLS + x)) free.push({ x, y });
    }
  }
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { food: free[Math.floor((nextSeed / 4294967296) * free.length)], seed: nextSeed };
}

export function createSnakeGame(difficulty: SnakeDifficulty = 'NORMAL', seed = Date.now()): SnakeState {
  const head = { x: Math.floor(SNAKE_COLS / 2), y: Math.floor(SNAKE_ROWS / 2) };
  const body = Array.from({ length: INITIAL_LENGTH }, (_, offset) => ({ x: head.x - offset, y: head.y }));
  return {
    body,
    direction: 'RIGHT',
    turnQueue: [],
    score: 0,
    difficulty,
    status: 'PAUSED',
    ...placeFood(body, seed >>> 0),
  };
}

/** Buffer two real turns, each relative to the previous queued heading. */
export function queueDirection(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== 'PLAYING' || state.turnQueue.length >= 2) return state;
  const previous = state.turnQueue.at(-1) ?? state.direction;
  if (direction === previous || direction === OPPOSITE[previous]) return state;
  return { ...state, turnQueue: [...state.turnQueue, direction] };
}

export function stepSnake(state: SnakeState): SnakeState {
  if (state.status !== 'PLAYING') return state;
  const direction = state.turnQueue[0] ?? state.direction;
  const turnQueue = state.turnQueue.slice(1);
  const vector = VECTOR[direction];
  const head = { x: state.body[0].x + vector.x, y: state.body[0].y + vector.y };
  const eating = state.food !== null && samePoint(head, state.food);
  // The tail vacates its cell during an ordinary move, so that cell is safe.
  const blockingBody = eating ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.x >= SNAKE_COLS || head.y < 0 || head.y >= SNAKE_ROWS
    || blockingBody.some((point) => samePoint(point, head))) {
    return { ...state, direction, turnQueue: [], status: 'GAME_OVER' };
  }
  const body = [head, ...(eating ? state.body : state.body.slice(0, -1))];
  if (!eating) return { ...state, body, direction, turnQueue };
  return {
    ...state,
    body,
    direction,
    turnQueue,
    score: state.score + POINTS_PER_FOOD,
    status: body.length === BOARD_SIZE ? 'WON' : 'PLAYING',
    ...placeFood(body, state.seed),
  };
}

export function pauseSnake(state: SnakeState): SnakeState {
  return state.status === 'PLAYING' ? { ...state, status: 'PAUSED' } : state;
}

export function resumeSnake(state: SnakeState): SnakeState {
  return state.status === 'PAUSED' ? { ...state, status: 'PLAYING' } : state;
}

export function getSnakeTickMs(state: SnakeState): number {
  return Math.max(65, BASE_TICK_MS[state.difficulty] - Math.floor(state.score / 50) * 12);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPoint(value: unknown): value is Point {
  return isRecord(value) && Number.isInteger(value.x) && Number.isInteger(value.y)
    && typeof value.x === 'number' && value.x >= 0 && value.x < SNAKE_COLS
    && typeof value.y === 'number' && value.y >= 0 && value.y < SNAKE_ROWS;
}

function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && Object.hasOwn(VECTOR, value);
}

/** Only playable checkpoints are restored, and opening the game never starts its clock. */
export function restoreSnakeGame(value: unknown): SnakeState | null {
  if (!isRecord(value) || (value.status !== 'PLAYING' && value.status !== 'PAUSED')
    || !isDirection(value.direction)
    || !SNAKE_DIFFICULTIES.some((difficulty) => difficulty === value.difficulty)
    || typeof value.seed !== 'number' || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 4294967295
    || !Array.isArray(value.body) || value.body.length < INITIAL_LENGTH || value.body.length >= BOARD_SIZE
    || !value.body.every(isPoint) || !isPoint(value.food)
    || typeof value.score !== 'number' || value.score !== (value.body.length - INITIAL_LENGTH) * POINTS_PER_FOOD
    || !Array.isArray(value.turnQueue) || value.turnQueue.length > 2) return null;

  const body = value.body;
  if (new Set(body.map(pointIndex)).size !== body.length || body.some((point) => samePoint(point, value.food as Point))) return null;
  for (let index = 1; index < body.length; index++) {
    if (Math.abs(body[index].x - body[index - 1].x) + Math.abs(body[index].y - body[index - 1].y) !== 1) return null;
  }
  const vector = VECTOR[value.direction];
  if (body[0].x - body[1].x !== vector.x || body[0].y - body[1].y !== vector.y) return null;
  let previous = value.direction;
  for (const direction of value.turnQueue) {
    if (!isDirection(direction) || direction === previous || direction === OPPOSITE[previous]) return null;
    previous = direction;
  }
  return {
    body: body.map(({ x, y }) => ({ x, y })),
    direction: value.direction,
    turnQueue: [...value.turnQueue] as Direction[],
    food: { x: value.food.x, y: value.food.y },
    score: value.score,
    difficulty: value.difficulty as SnakeDifficulty,
    status: 'PAUSED',
    seed: value.seed,
  };
}
