// src/engine/galaxyEngine.ts

export const GRID_COLS = 6;
export const GRID_ROWS = 10;
export const PREVIEW_SIZE = 3;
export const SCORE_PER_LEVEL = 180;

export type CellKind = "EMPTY" | "NORMAL" | "STONE" | "BOMB" | "FLASH" | "STAR";
export type GameMode = "CLASSIC" | "COMFORT" | "PRACTICE";
export type RotationMode = "GEOMETRY_90" | "COLOR_CYCLE";
export type MascotMood = "IDLE" | "HAPPY" | "COMBO" | "DANGER" | "TRANSITION";

export interface Cell {
  kind: CellKind;
  colorId?: number;
}

export interface PieceCellOffset {
  dx: number;
  dy: number;
  kind: CellKind;
  colorId?: number;
}

export interface ActivePiece {
  x: number;
  y: number;
  cells: PieceCellOffset[];
  isSingleSpecial: boolean;
}

export interface GameConfig {
  mode: GameMode;
  numColors: number;
  initialFallMs: number;
  minFallMs: number;
  speedDecayPerLevel: number;
  threeBlockUnlockLevel: number;
  experimentalFourBlockPieces: boolean;
  rotationMode: RotationMode;
  allowHardDrop: boolean;
  showGhostPiece: boolean;
  bombRadius: number;
  stoneChanceBase: number;
  specialChanceBase: number;
  maxConsecutiveHazards: number;
}

export const MODE_CONFIGS: Record<GameMode, GameConfig> = {
  CLASSIC: {
    mode: "CLASSIC",
    numColors: 5,
    initialFallMs: 950,
    minFallMs: 260,
    speedDecayPerLevel: 75,
    threeBlockUnlockLevel: 1,
    experimentalFourBlockPieces: false,
    rotationMode: "GEOMETRY_90",
    allowHardDrop: false,
    showGhostPiece: false,
    bombRadius: 1,
    stoneChanceBase: 0.08,
    specialChanceBase: 0.09,
    maxConsecutiveHazards: 2,
  },
  COMFORT: {
    mode: "COMFORT",
    numColors: 5,
    initialFallMs: 720,
    minFallMs: 240,
    speedDecayPerLevel: 60,
    threeBlockUnlockLevel: 1,
    experimentalFourBlockPieces: false,
    rotationMode: "GEOMETRY_90",
    allowHardDrop: true,
    showGhostPiece: true,
    bombRadius: 1,
    stoneChanceBase: 0.07,
    specialChanceBase: 0.11,
    maxConsecutiveHazards: 2,
  },
  PRACTICE: {
    mode: "PRACTICE",
    numColors: 5,
    initialFallMs: 1100,
    minFallMs: 450,
    speedDecayPerLevel: 30,
    threeBlockUnlockLevel: 1,
    experimentalFourBlockPieces: false,
    rotationMode: "GEOMETRY_90",
    allowHardDrop: true,
    showGhostPiece: true,
    bombRadius: 1,
    stoneChanceBase: 0.04,
    specialChanceBase: 0.14,
    maxConsecutiveHazards: 1,
  },
};

export interface MascotInfo {
  id: number;
  name: string;
  species: string;
  furColor: string;
  cheeksColor: string;
  earColor: string;
  eyeColor: string;
  stripes: boolean;
}

export const MASCOTS: MascotInfo[] = [
  {
    id: 0,
    name: "Pikko",
    species: "Golden Space Hamster",
    furColor: "#F59E0B",
    cheeksColor: "#FEF3C7",
    earColor: "#D97706",
    eyeColor: "#1D4ED8",
    stripes: false,
  },
  {
    id: 1,
    name: "Tigra",
    species: "Striped Tabby Pilot",
    furColor: "#D69E5C",
    cheeksColor: "#FDE68A",
    earColor: "#78350F",
    eyeColor: "#EAB308",
    stripes: true,
  },
  {
    id: 2,
    name: "Zorbi",
    species: "Azure Star Fox",
    furColor: "#38BDF8",
    cheeksColor: "#E0F2FE",
    earColor: "#0284C7",
    eyeColor: "#FDE047",
    stripes: false,
  },
  {
    id: 3,
    name: "Nyxie",
    species: "Violet Nova Lynx",
    furColor: "#A855F7",
    cheeksColor: "#F3E8FF",
    earColor: "#6B21A8",
    eyeColor: "#4ADE80",
    stripes: true,
  },
];

export interface HighScoreEntry {
  alias: string;
  score: number;
  level: number;
  date: string;
}

export interface LockResolutionSummary {
  clearedCount: number;
  chainDepth: number;
  scoreDelta: number;
  stoneLanded: boolean;
  specialTriggered: CellKind | null;
  levelUp: boolean;
  gameOver: boolean;
}

export interface EngineState {
  grid: Cell[][];
  activePiece: ActivePiece | null;
  nextPiece: ActivePiece;
  score: number;
  level: number;
  piecesPlaced: number;
  linesOrMatchesCleared: number;
  lastChainDepth: number;
  lastSpecialTriggered: CellKind | null;
  mascotIndex: number;
  mascotMood: MascotMood;
  status: "MENU" | "PLAYING" | "PAUSED" | "GAME_OVER";
  config: GameConfig;
  seed: number;
  consecutiveHazards: number;
}

export function nextRandom(seed: number): { value: number; nextSeed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextSeed: (seed + 1) | 0 };
}

export function createEmptyGrid(): Cell[][] {
  return Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ({ kind: "EMPTY" }))
  );
}

export function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function getPiecePreview(piece: ActivePiece): Cell[][] {
  const preview: Cell[][] = Array.from({ length: PREVIEW_SIZE }, () =>
    Array.from({ length: PREVIEW_SIZE }, () => ({ kind: "EMPTY" }))
  );
  if (piece.cells.length === 0) return preview;

  const minX = Math.min(...piece.cells.map((cell) => cell.dx));
  const minY = Math.min(...piece.cells.map((cell) => cell.dy));
  const width = Math.max(...piece.cells.map((cell) => cell.dx)) - minX + 1;
  const height = Math.max(...piece.cells.map((cell) => cell.dy)) - minY + 1;
  const offsetX = Math.floor((PREVIEW_SIZE - width) / 2) - minX;
  const offsetY = Math.floor((PREVIEW_SIZE - height) / 2) - minY;

  for (const cell of piece.cells) {
    const col = cell.dx + offsetX;
    const row = cell.dy + offsetY;
    if (row >= 0 && row < PREVIEW_SIZE && col >= 0 && col < PREVIEW_SIZE) {
      preview[row][col] = { kind: cell.kind, colorId: cell.colorId };
    }
  }
  return preview;
}

export function generatePiece(
  config: GameConfig,
  level: number,
  seed: number,
  consecutiveHazards: number,
  openingBlockCount?: 2 | 3
): { piece: ActivePiece; nextSeed: number; nextConsecutiveHazards: number } {
  let currentSeed = seed;
  const rand = () => {
    const r = nextRandom(currentSeed);
    currentSeed = r.nextSeed;
    return r.value;
  };

  const specialChance = Math.min(
    0.18,
    config.specialChanceBase + (level - 1) * 0.01
  );
  if (openingBlockCount === undefined && rand() < specialChance) {
    const roll = rand();
    const specialKind: CellKind =
      roll < 0.36 ? "BOMB" : roll < 0.7 ? "FLASH" : "STAR";
    return {
      piece: {
        x: Math.floor(GRID_COLS / 2) - 1,
        y: 0,
        cells: [{ dx: 0, dy: 0, kind: specialKind }],
        isSingleSpecial: true,
      },
      nextSeed: currentSeed,
      nextConsecutiveHazards: 0,
    };
  }

  let numBlocks: number = openingBlockCount ?? 2;
  if (openingBlockCount === undefined && level >= config.threeBlockUnlockLevel) {
    const threeChance = Math.min(
      0.65,
      0.35 + (level - config.threeBlockUnlockLevel) * 0.1
    );
    if (rand() < threeChance) {
      numBlocks = 3;
    }
  }
  if (openingBlockCount === undefined && config.experimentalFourBlockPieces && level >= 4 && rand() < 0.2) {
    numBlocks = 4;
  }

  let offsets: { dx: number; dy: number }[] = [
    { dx: 0, dy: 0 },
    { dx: 0, dy: 1 },
  ];

  if (numBlocks === 2) {
    offsets =
      rand() < 0.5
        ? [
            { dx: 0, dy: 0 },
            { dx: 0, dy: 1 },
          ]
        : [
            { dx: 0, dy: 0 },
            { dx: 1, dy: 0 },
          ];
  } else if (numBlocks === 3) {
    const shapes = [
      [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: 2 }],
      [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }],
      [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }],
      [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }],
      [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 }],
      [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }],
    ];
    offsets = shapes[Math.floor(rand() * shapes.length)];
  } else if (numBlocks === 4) {
    offsets = [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 },
    ];
  }

  const stoneChance =
    consecutiveHazards >= config.maxConsecutiveHazards
      ? 0
      : Math.min(0.25, config.stoneChanceBase + (level - 1) * 0.02);

  let hasStone = false;
  const activeColors = Math.min(5, config.numColors);

  const cells: PieceCellOffset[] = offsets.map((off, idx) => {
    if (!hasStone && idx === 0 && rand() < stoneChance) {
      hasStone = true;
      return { dx: off.dx, dy: off.dy, kind: "STONE" };
    }
    const colorId = Math.floor(rand() * activeColors);
    return { dx: off.dx, dy: off.dy, kind: "NORMAL", colorId };
  });

  return {
    piece: {
      x: Math.floor(GRID_COLS / 2) - 1,
      y: 0,
      cells,
      isSingleSpecial: false,
    },
    nextSeed: currentSeed,
    nextConsecutiveHazards: hasStone ? consecutiveHazards + 1 : 0,
  };
}

export function canPlacePiece(
  grid: Cell[][],
  piece: ActivePiece,
  targetX = piece.x,
  targetY = piece.y,
  targetCells = piece.cells
): boolean {
  for (const c of targetCells) {
    const gx = targetX + c.dx;
    const gy = targetY + c.dy;
    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) {
      return false;
    }
    if (grid[gy][gx].kind !== "EMPTY") {
      return false;
    }
  }
  return true;
}

export function movePiece(state: EngineState, dx: number, dy: number): boolean {
  if (state.status !== "PLAYING" || !state.activePiece) return false;
  const p = state.activePiece;
  if (canPlacePiece(state.grid, p, p.x + dx, p.y + dy)) {
    state.activePiece = { ...p, x: p.x + dx, y: p.y + dy };
    return true;
  }
  return false;
}

export function rotateActivePiece(state: EngineState): boolean {
  if (state.status !== "PLAYING" || !state.activePiece) return false;
  const p = state.activePiece;
  if (p.cells.length <= 1) return false;

  if (state.config.rotationMode === "COLOR_CYCLE") {
    const cycled: PieceCellOffset[] = p.cells.map((cell, idx) => {
      const prev = p.cells[(idx + p.cells.length - 1) % p.cells.length];
      return {
        dx: cell.dx,
        dy: cell.dy,
        kind: prev.kind,
        colorId: prev.colorId,
      };
    });
    state.activePiece = { ...p, cells: cycled };
    return true;
  }

  const rawRotated = p.cells.map((c) => ({
    ...c,
    dx: -c.dy,
    dy: c.dx,
  }));
  const minDx = Math.min(...rawRotated.map((c) => c.dx));
  const minDy = Math.min(...rawRotated.map((c) => c.dy));
  const normalized = rawRotated.map((c) => ({
    ...c,
    dx: c.dx - minDx,
    dy: c.dy - minDy,
  }));

  const kicks = [
    { kx: 0, ky: 0 },
    { kx: -1, ky: 0 },
    { kx: 1, ky: 0 },
    { kx: -2, ky: 0 },
    { kx: 0, ky: -1 },
  ];

  for (const { kx, ky } of kicks) {
    if (canPlacePiece(state.grid, p, p.x + kx, p.y + ky, normalized)) {
      state.activePiece = {
        ...p,
        x: p.x + kx,
        y: p.y + ky,
        cells: normalized,
      };
      return true;
    }
  }

  const cycled: PieceCellOffset[] = p.cells.map((cell, idx) => {
    const prev = p.cells[(idx + p.cells.length - 1) % p.cells.length];
    return {
      dx: cell.dx,
      dy: cell.dy,
      kind: prev.kind,
      colorId: prev.colorId,
    };
  });
  state.activePiece = { ...p, cells: cycled };
  return true;
}

export function getGhostY(grid: Cell[][], piece: ActivePiece): number {
  let gy = piece.y;
  while (canPlacePiece(grid, piece, piece.x, gy + 1)) {
    gy++;
  }
  return gy;
}

export function applyGravity(grid: Cell[][]): boolean {
  let moved = false;
  for (let col = 0; col < GRID_COLS; col++) {
    let writeRow = GRID_ROWS - 1;
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      const cell = grid[row][col];
      if (cell.kind !== "EMPTY") {
        if (writeRow !== row) {
          grid[writeRow][col] = { ...cell };
          grid[row][col] = { kind: "EMPTY" };
          moved = true;
        }
        writeRow--;
      }
    }
  }
  return moved;
}

export function findMatches(grid: Cell[][]): { row: number; col: number }[] {
  const matchedSet = new Set<string>();
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const startCell = grid[r][c];
      if (startCell.kind !== "NORMAL" || startCell.colorId === undefined)
        continue;

      for (const { dr, dc } of directions) {
        const prevR = r - dr;
        const prevC = c - dc;
        if (
          prevR >= 0 &&
          prevR < GRID_ROWS &&
          prevC >= 0 &&
          prevC < GRID_COLS &&
          grid[prevR][prevC].kind === "NORMAL" &&
          grid[prevR][prevC].colorId === startCell.colorId
        ) {
          continue;
        }

        const run: { row: number; col: number }[] = [{ row: r, col: c }];
        let nr = r + dr;
        let nc = c + dc;
        while (
          nr >= 0 &&
          nr < GRID_ROWS &&
          nc >= 0 &&
          nc < GRID_COLS &&
          grid[nr][nc].kind === "NORMAL" &&
          grid[nr][nc].colorId === startCell.colorId
        ) {
          run.push({ row: nr, col: nc });
          nr += dr;
          nc += dc;
        }

        if (run.length >= 3) {
          for (const pos of run) {
            matchedSet.add(`${pos.row},${pos.col}`);
          }
        }
      }
    }
  }

  return Array.from(matchedSet).map((key) => {
    const [row, col] = key.split(",").map(Number);
    return { row, col };
  });
}

export function resolveSpecialLanding(
  grid: Cell[][],
  landedRow: number,
  landedCol: number,
  specialKind: CellKind,
  bombRadius = 1
): number {
  let removedCount = 0;

  if (specialKind === "BOMB") {
    for (let r = landedRow - bombRadius; r <= landedRow + bombRadius; r++) {
      for (let c = landedCol - bombRadius; c <= landedCol + bombRadius; c++) {
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
          if (grid[r][c].kind !== "EMPTY") {
            if (r !== landedRow || c !== landedCol) removedCount++;
            grid[r][c] = { kind: "EMPTY" };
          }
        }
      }
    }
  } else if (specialKind === "FLASH") {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (grid[r][landedCol].kind !== "EMPTY") {
        if (r !== landedRow) removedCount++;
        grid[r][landedCol] = { kind: "EMPTY" };
      }
    }
  } else if (specialKind === "STAR") {
    let targetColor: number | undefined;
    const candidates = [
      { r: landedRow + 1, c: landedCol },
      { r: landedRow, c: landedCol - 1 },
      { r: landedRow, c: landedCol + 1 },
      { r: landedRow + 1, c: landedCol - 1 },
      { r: landedRow + 1, c: landedCol + 1 },
    ];
    for (const pos of candidates) {
      if (pos.r >= 0 && pos.r < GRID_ROWS && pos.c >= 0 && pos.c < GRID_COLS) {
        const cell = grid[pos.r][pos.c];
        if (cell.kind === "NORMAL" && cell.colorId !== undefined) {
          targetColor = cell.colorId;
          break;
        }
      }
    }

    grid[landedRow][landedCol] = { kind: "EMPTY" };

    if (targetColor !== undefined) {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (
            grid[r][c].kind === "NORMAL" &&
            grid[r][c].colorId === targetColor
          ) {
            grid[r][c] = { kind: "EMPTY" };
            removedCount++;
          }
        }
      }
    }
  }

  applyGravity(grid);
  return removedCount;
}

export function resolveCascades(grid: Cell[][]): {
  totalCleared: number;
  chainDepth: number;
  scoreDelta: number;
} {
  let totalCleared = 0;
  let chainDepth = 0;
  let scoreDelta = 0;

  while (true) {
    applyGravity(grid);
    const matches = findMatches(grid);
    if (matches.length === 0) break;

    chainDepth++;
    for (const { row, col } of matches) {
      grid[row][col] = { kind: "EMPTY" };
    }
    totalCleared += matches.length;
    const chainMultiplier = 1 + 0.5 * (chainDepth - 1);
    scoreDelta += Math.round(10 * matches.length * chainMultiplier);
    applyGravity(grid);
  }

  return { totalCleared, chainDepth, scoreDelta };
}

export function getFallIntervalMs(config: GameConfig, level: number): number {
  return Math.max(
    config.minFallMs,
    config.initialFallMs - (level - 1) * config.speedDecayPerLevel
  );
}

export function createNewGameState(
  mode: GameMode = "CLASSIC",
  customConfig?: Partial<GameConfig>,
  seed = Date.now()
): EngineState {
  const config: GameConfig = { ...MODE_CONFIGS[mode], ...customConfig };
  const grid = createEmptyGrid();

  const firstGen = generatePiece(config, 1, seed, 0, 2);
  const secondGen = generatePiece(
    config,
    1,
    firstGen.nextSeed,
    firstGen.nextConsecutiveHazards,
    config.threeBlockUnlockLevel <= 1 ? 3 : 2
  );

  return {
    grid,
    activePiece: firstGen.piece,
    nextPiece: secondGen.piece,
    score: 0,
    level: 1,
    piecesPlaced: 0,
    linesOrMatchesCleared: 0,
    lastChainDepth: 0,
    lastSpecialTriggered: null,
    mascotIndex: 0,
    mascotMood: "IDLE",
    status: "PLAYING",
    config,
    seed: secondGen.nextSeed,
    consecutiveHazards: secondGen.nextConsecutiveHazards,
  };
}

export function lockActivePieceAndResolve(
  state: EngineState
): LockResolutionSummary {
  const summary: LockResolutionSummary = {
    clearedCount: 0,
    chainDepth: 0,
    scoreDelta: 0,
    stoneLanded: false,
    specialTriggered: null,
    levelUp: false,
    gameOver: false,
  };

  if (!state.activePiece) return summary;
  const p = state.activePiece;

  let specialPos: { row: number; col: number; kind: CellKind } | null = null;
  for (const c of p.cells) {
    const r = p.y + c.dy;
    const col = p.x + c.dx;
    if (r >= 0 && r < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      state.grid[r][col] = { kind: c.kind, colorId: c.colorId };
      if (c.kind === "STONE") summary.stoneLanded = true;
      if (c.kind === "BOMB" || c.kind === "FLASH" || c.kind === "STAR") {
        specialPos = { row: r, col, kind: c.kind };
      }
    }
  }

  state.piecesPlaced++;
  state.activePiece = null;

  applyGravity(state.grid);

  if (specialPos) {
    let settledRow = specialPos.row;
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (state.grid[r][specialPos.col].kind === specialPos.kind) {
        settledRow = r;
        break;
      }
    }
    const specialRemoved = resolveSpecialLanding(
      state.grid,
      settledRow,
      specialPos.col,
      specialPos.kind,
      state.config.bombRadius
    );
    summary.specialTriggered = specialPos.kind;
    summary.clearedCount += specialRemoved;
    summary.scoreDelta += specialRemoved * 10;
  }

  const cascade = resolveCascades(state.grid);
  summary.clearedCount += cascade.totalCleared;
  summary.chainDepth = cascade.chainDepth;
  summary.scoreDelta += cascade.scoreDelta;

  state.score += summary.scoreDelta;
  state.linesOrMatchesCleared += cascade.totalCleared;
  state.lastChainDepth = cascade.chainDepth;
  state.lastSpecialTriggered = summary.specialTriggered;

  const targetLevel = Math.max(1, Math.floor(state.score / SCORE_PER_LEVEL) + 1);
  if (targetLevel > state.level) {
    state.level = targetLevel;
    summary.levelUp = true;
    state.mascotIndex = Math.min(MASCOTS.length - 1, state.level - 1);
  }

  const highestOccupiedRow = state.grid.findIndex((row) =>
    row.some((cell) => cell.kind !== "EMPTY")
  );
  const nearTop = highestOccupiedRow !== -1 && highestOccupiedRow <= 2;

  if (summary.levelUp) {
    state.mascotMood = "TRANSITION";
  } else if (cascade.chainDepth >= 2) {
    state.mascotMood = "COMBO";
  } else if (summary.clearedCount > 0) {
    state.mascotMood = "HAPPY";
  } else if (nearTop) {
    state.mascotMood = "DANGER";
  } else {
    state.mascotMood = "IDLE";
  }

  const candidate = state.nextPiece;
  const nextGen = generatePiece(
    state.config,
    state.level,
    state.seed,
    state.consecutiveHazards
  );
  state.seed = nextGen.nextSeed;
  state.consecutiveHazards = nextGen.nextConsecutiveHazards;
  state.nextPiece = nextGen.piece;

  if (!canPlacePiece(state.grid, candidate)) {
    state.status = "GAME_OVER";
    summary.gameOver = true;
  } else {
    state.activePiece = candidate;
  }

  return summary;
}

export function stepGravityTick(
  state: EngineState
): LockResolutionSummary | null {
  if (state.status !== "PLAYING" || !state.activePiece) return null;
  if (movePiece(state, 0, 1)) {
    return null;
  }
  return lockActivePieceAndResolve(state);
}
