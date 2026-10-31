export const SNAKE_COLS = 18;
export const SNAKE_ROWS = 18;
export const SNAKE_DIFFICULTIES = ['EASY', 'NORMAL', 'FAST'] as const;
export const SNAKE_MODES = ['CLASSIC', 'ARCADE'] as const;
export const SNAKE_COMBO_TICKS = 36;
export const SNAKE_BONUS_TICKS = 50;

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type SnakeDifficulty = (typeof SNAKE_DIFFICULTIES)[number];
export type SnakeMode = (typeof SNAKE_MODES)[number];
export type Point = { x: number; y: number };
export type SnakeState = {
  rulesVersion: 2;
  mode: SnakeMode;
  body: Point[];
  direction: Direction;
  turnQueue: Direction[];
  food: Point | null;
  score: number;
  difficulty: SnakeDifficulty;
  status: 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'WON';
  seed: number;
  rocks: Point[];
  combo: number;
  comboTicks: number;
  bestCombo: number;
  bonus: { position: Point; ticksLeft: number } | null;
  bonusCollected: number;
  deathReason: 'wall' | 'body' | 'rock' | null;
};

const INITIAL_LENGTH = 4;
const POINTS_PER_FOOD = 10;
const BOARD_SIZE = SNAKE_COLS * SNAKE_ROWS;
const ARCADE_ROCKS: Point[] = [
  { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 12, y: 4 }, { x: 13, y: 4 },
  { x: 4, y: 13 }, { x: 5, y: 13 }, { x: 12, y: 13 }, { x: 13, y: 13 },
];
const BASE_TICK_MS: Record<SnakeDifficulty, number> = { EASY: 220, NORMAL: 160, FAST: 110 };
const VECTOR: Record<Direction, Point> = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

const samePoint = (first: Point, second: Point) => first.x === second.x && first.y === second.y;
const pointIndex = ({ x, y }: Point) => y * SNAKE_COLS + x;
const copyPoint = ({ x, y }: Point): Point => ({ x, y });

function placeFood(occupiedPoints: Point[], seed: number): { food: Point | null; seed: number } {
  const occupied = new Set(occupiedPoints.map(pointIndex));
  const free: Point[] = [];
  for (let y = 0; y < SNAKE_ROWS; y++) {
    for (let x = 0; x < SNAKE_COLS; x++) {
      if (!occupied.has(y * SNAKE_COLS + x)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { food: null, seed };
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { food: free[Math.floor((nextSeed / 4294967296) * free.length)], seed: nextSeed };
}

export function createSnakeGame(
  difficulty: SnakeDifficulty = 'NORMAL', seed = Date.now(), mode: SnakeMode = 'CLASSIC',
): SnakeState {
  const head = { x: Math.floor(SNAKE_COLS / 2), y: Math.floor(SNAKE_ROWS / 2) };
  const body = Array.from({ length: INITIAL_LENGTH }, (_, offset) => ({ x: head.x - offset, y: head.y }));
  const rocks = mode === 'ARCADE' ? ARCADE_ROCKS.map(copyPoint) : [];
  return {
    rulesVersion: 2, mode, body, rocks,
    direction: 'RIGHT', turnQueue: [], score: 0, difficulty, status: 'PAUSED',
    combo: 0, comboTicks: 0, bestCombo: 0, bonus: null, bonusCollected: 0, deathReason: null,
    ...placeFood([...body, ...rocks], seed >>> 0),
  };
}

/** Keep the next turn, while allowing the player to correct the following turn. */
export function queueDirection(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== 'PLAYING') return state;
  if (state.turnQueue.length >= 2) {
    const first = state.turnQueue[0];
    if (direction === OPPOSITE[first] || direction === state.turnQueue[1]) return state;
    return { ...state, turnQueue: direction === first ? [first] : [first, direction] };
  }
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
  // The tail vacates its cell during an ordinary or golden-fruit move.
  const blockingBody = eating ? state.body : state.body.slice(0, -1);
  const deathReason = head.x < 0 || head.x >= SNAKE_COLS || head.y < 0 || head.y >= SNAKE_ROWS ? 'wall'
    : state.rocks.some(point => samePoint(point, head)) ? 'rock'
      : blockingBody.some(point => samePoint(point, head)) ? 'body' : null;
  if (deathReason) return { ...state, direction, turnQueue: [], status: 'GAME_OVER', deathReason };

  const body = [head, ...(eating ? state.body : state.body.slice(0, -1))];
  const arcade = state.mode === 'ARCADE';
  const gold = arcade && state.bonus !== null && samePoint(head, state.bonus.position);
  const comboTicks = Math.max(0, state.comboTicks - 1);
  const combo = eating && arcade ? (state.comboTicks > 0 ? Math.min(3, state.combo + 1) : 1)
    : comboTicks > 0 ? state.combo : 0;
  let bonus = gold || !state.bonus || state.bonus.ticksLeft <= 1 ? null
    : { position: state.bonus.position, ticksLeft: state.bonus.ticksLeft - 1 };
  let seed = state.seed;
  let food = state.food;
  const won = body.length === BOARD_SIZE - state.rocks.length;

  if (eating) {
    let placement = placeFood([...body, ...state.rocks, ...(bonus ? [bonus.position] : [])], seed);
    // The last empty cell must remain regular food so the board can be completed.
    if (placement.food === null && !won && bonus) {
      bonus = null;
      placement = placeFood([...body, ...state.rocks], seed);
    }
    ({ food, seed } = placement);
    if (arcade && !won && (body.length - INITIAL_LENGTH) % 5 === 0) {
      const placement = placeFood([...body, ...state.rocks, ...(food ? [food] : [])], seed);
      seed = placement.seed;
      bonus = placement.food ? { position: placement.food, ticksLeft: SNAKE_BONUS_TICKS } : null;
    }
  }

  return {
    ...state, body, direction, turnQueue, food, seed,
    score: state.score + (eating ? POINTS_PER_FOOD * (arcade ? combo : 1) : 0) + (gold ? 50 : 0),
    status: won ? 'WON' : 'PLAYING',
    combo, comboTicks: eating && arcade ? SNAKE_COMBO_TICKS : comboTicks,
    bestCombo: Math.max(state.bestCombo, combo),
    bonus: won ? null : bonus,
    bonusCollected: state.bonusCollected + (gold ? 1 : 0),
  };
}

export function pauseSnake(state: SnakeState): SnakeState {
  return state.status === 'PLAYING' ? { ...state, status: 'PAUSED' } : state;
}

export function resumeSnake(state: SnakeState): SnakeState {
  return state.status === 'PAUSED' ? { ...state, status: 'PLAYING' } : state;
}

export function getSnakeLevel(state: SnakeState): number {
  return Math.floor((state.body.length - INITIAL_LENGTH) / 5) + 1;
}

export function getSnakeTickMs(state: SnakeState): number {
  return Math.max(65, BASE_TICK_MS[state.difficulty] - (getSnakeLevel(state) - 1) * 12);
}

export function getSnakeMaxScore(mode: SnakeMode): number {
  const foods = BOARD_SIZE - (mode === 'ARCADE' ? ARCADE_ROCKS.length : 0) - INITIAL_LENGTH;
  return mode === 'ARCADE' ? foods * 30 + Math.floor(foods / 5) * 50 : foods * POINTS_PER_FOOD;
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

function isIntegerIn(value: unknown, low: number, high: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
}

/** Only playable checkpoints are restored, and opening the game never starts its clock. */
export function restoreSnakeGame(value: unknown): SnakeState | null {
  if (!isRecord(value) || (value.status !== 'PLAYING' && value.status !== 'PAUSED')
    || !isDirection(value.direction)
    || !SNAKE_DIFFICULTIES.some(difficulty => difficulty === value.difficulty)
    || !isIntegerIn(value.seed, 0, 4294967295)
    || !Array.isArray(value.body) || value.body.length < INITIAL_LENGTH || value.body.length >= BOARD_SIZE
    || !value.body.every(isPoint) || !isPoint(value.food)
    || !isIntegerIn(value.score, 0, getSnakeMaxScore('ARCADE')) || value.score % 10 !== 0
    || !Array.isArray(value.turnQueue) || value.turnQueue.length > 2) return null;

  const legacy = value.rulesVersion === undefined;
  if (legacy && ['mode', 'rocks', 'combo', 'comboTicks', 'bestCombo', 'bonus', 'bonusCollected', 'deathReason']
    .some(key => value[key] !== undefined)) return null;
  if (!legacy && (value.rulesVersion !== 2 || !SNAKE_MODES.some(mode => mode === value.mode))) return null;
  const mode = legacy ? 'CLASSIC' : value.mode as SnakeMode;
  const rocks = mode === 'ARCADE' ? ARCADE_ROCKS : [];
  if (!legacy && (!Array.isArray(value.rocks) || value.rocks.length !== rocks.length
    || !value.rocks.every(isPoint) || new Set(value.rocks.map(pointIndex)).size !== rocks.length
    || !rocks.every(rock => (value.rocks as Point[]).some(point => samePoint(rock, point)))
    || value.deathReason !== null)) return null;

  const body = value.body;
  const foods = body.length - INITIAL_LENGTH;
  if (body.length >= BOARD_SIZE - rocks.length || new Set(body.map(pointIndex)).size !== body.length
    || body.some(point => samePoint(point, value.food as Point))
    || rocks.some(rock => body.some(point => samePoint(point, rock)) || samePoint(rock, value.food as Point))) return null;
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

  let combo = 0, comboTicks = 0, bestCombo = 0, bonusCollected = 0;
  let bonus: SnakeState['bonus'] = null;
  if (mode === 'CLASSIC') {
    if (value.score !== foods * POINTS_PER_FOOD || (!legacy && (value.combo !== 0 || value.comboTicks !== 0
      || value.bestCombo !== 0 || value.bonus !== null || value.bonusCollected !== 0))) return null;
  } else {
    if (!isIntegerIn(value.combo, 0, 3) || !isIntegerIn(value.comboTicks, 0, SNAKE_COMBO_TICKS)
      || !isIntegerIn(value.bestCombo, foods > 0 ? 1 : 0, Math.min(3, foods))
      || !isIntegerIn(value.bonusCollected, 0, Math.floor(foods / 5))
      || (value.combo === 0) !== (value.comboTicks === 0) || value.bestCombo < value.combo) return null;
    ({ combo, comboTicks, bestCombo, bonusCollected } = value as unknown as SnakeState);
    const chainPremium = bestCombo === 3 ? 30 : bestCombo === 2 ? 10 : 0;
    const maxFoodPoints = foods * Math.max(1, bestCombo) * POINTS_PER_FOOD - chainPremium;
    if (value.score < foods * POINTS_PER_FOOD + chainPremium + bonusCollected * 50
      || value.score > maxFoodPoints + bonusCollected * 50) return null;
    if (value.bonus !== null) {
      if (foods < 5 || bonusCollected >= Math.floor(foods / 5) || !isRecord(value.bonus) || !isPoint(value.bonus.position)
        || !isIntegerIn(value.bonus.ticksLeft, 1, SNAKE_BONUS_TICKS)
        || [...body, ...rocks, value.food].some(point => samePoint(point, (value.bonus as { position: Point }).position))) return null;
      bonus = { position: copyPoint(value.bonus.position), ticksLeft: value.bonus.ticksLeft };
    }
  }

  return {
    rulesVersion: 2, mode, rocks: rocks.map(copyPoint),
    body: body.map(copyPoint), direction: value.direction, turnQueue: [...value.turnQueue] as Direction[],
    food: copyPoint(value.food), score: value.score, difficulty: value.difficulty as SnakeDifficulty,
    status: 'PAUSED', seed: value.seed,
    combo, comboTicks, bestCombo, bonus, bonusCollected, deathReason: null,
  };
}
