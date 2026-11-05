export const LUDO_COLORS = ['red', 'green', 'yellow', 'blue', 'purple', 'orange'] as const;
export type LudoColor = (typeof LUDO_COLORS)[number];
export type LudoSeat = { color: LudoColor; kind: 'human' | 'computer'; tokens: [number, number, number, number] };
export type LudoSetup = { humans: number; computers: number };
export type LudoEvent = 'new' | 'roll' | 'noMove' | 'threeSixes' | 'capture' | 'home' | 'move' | 'win';
export type LudoState = {
  version: 1;
  seats: LudoSeat[];
  turn: number;
  phase: 'roll' | 'choose' | 'finished';
  die: number | null;
  sixes: number;
  seed: number;
  winner: LudoColor | null;
  event: LudoEvent;
  lastRoll: number | null;
  rolls?: Partial<Record<LudoColor, number>>;
};

export const START_INDEX: Record<LudoColor, number> = { red: 1, green: 14, yellow: 27, blue: 40, purple: 0, orange: 0 };
export const SAFE_INDEX = new Set([1, 9, 14, 22, 27, 35, 40, 48]);
export const FINISH = 58;
const INITIAL_TOKENS: LudoSeat['tokens'] = [-1, -1, -1, -1];

export function createLudoGame(setup: LudoSetup, seed = Date.now()): LudoState {
  const humans = setup.humans;
  const computers = setup.computers;
  const count = humans + computers;
  if (!Number.isInteger(humans) || !Number.isInteger(computers)
    || humans < 1 || computers < 0 || count < 2 || count > 6) throw new Error('Choose two to six players.');
  const colors = count === 2 ? ['red', 'yellow'] as const : LUDO_COLORS;
  return {
    version: 1,
    seats: Array.from({ length: count }, (_, index) => ({
      color: colors[index], kind: index < humans ? 'human' : 'computer', tokens: [...INITIAL_TOKENS],
    })),
    turn: 0, phase: 'roll', die: null, sixes: 0, seed: seed >>> 0,
    winner: null, event: 'new', lastRoll: null,
  };
}

export const SIX_START: Record<LudoColor, number> = { red: 7, green: 20, yellow: 33, blue: 46, purple: 59, orange: 72 };
export function trackLength(state: LudoState): number { return state.seats.length > 4 ? 78 : 52; }
export function finishFor(state: LudoState): number { return trackLength(state) + 6; }
export function isSafe(index: number, six = false): boolean {
  return six ? index % 13 === 7 || index % 13 === 2 : SAFE_INDEX.has(index);
}
export function trackIndex(color: LudoColor, progress: number, six = false): number {
  return ((six ? SIX_START : START_INDEX)[color] + progress) % (six ? 78 : 52);
}

export function legalTokens(state: LudoState): number[] {
  const die = state.die;
  if (state.phase !== 'choose' || die === null) return [];
  return state.seats[state.turn].tokens.flatMap((progress, index) =>
    progress === finishFor(state) || (progress === -1 ? die !== 6 : progress + die > finishFor(state)) ? [] : [index]);
}

function nextTurn(state: LudoState, event: LudoEvent): LudoState {
  return { ...state, turn: (state.turn + 1) % state.seats.length, phase: 'roll', die: null, sixes: 0, event };
}

/** A supplied value is used by rule tests; matches advance their own deterministic die seed. */
export function rollLudo(state: LudoState, supplied?: number): LudoState {
  if (state.phase !== 'roll') return state;
  const seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  const die = supplied === undefined ? Math.floor(seed / 4294967296 * 6) + 1 : supplied;
  if (!Number.isInteger(die) || die < 1 || die > 6) throw new Error('The die must show one through six.');
  const sixes = die === 6 ? state.sixes + 1 : 0;
  const rolled: LudoState = { ...state, seed, die, lastRoll: die, sixes, phase: 'choose', event: 'roll',
    rolls: { ...state.rolls, [state.seats[state.turn].color]: die } };
  if (sixes === 3) return nextTurn(rolled, 'threeSixes');
  if (legalTokens(rolled).length === 0) {
    return die === 6 ? { ...rolled, phase: 'roll', die: null, event: 'noMove' }
      : nextTurn(rolled, 'noMove');
  }
  return rolled;
}

export function moveLudoToken(state: LudoState, tokenIndex: number): LudoState {
  if (!legalTokens(state).includes(tokenIndex) || state.die === null) return state;
  const die = state.die;
  const player = state.seats[state.turn];
  const current = player.tokens[tokenIndex];
  const destination = current === -1 ? 0 : current + die;
  const seats = state.seats.map((seat, seatIndex) => {
    const tokens = [...seat.tokens] as LudoSeat['tokens'];
    if (seatIndex === state.turn) tokens[tokenIndex] = destination;
    return { ...seat, tokens };
  });
  let captured = false;
  if (destination < trackLength(state)) {
    const landing = trackIndex(player.color, destination, state.seats.length > 4);
    if (!isSafe(landing, state.seats.length > 4)) {
      seats.forEach((seat, seatIndex) => {
        if (seatIndex === state.turn) return;
        seat.tokens.forEach((progress, index) => {
          if (progress >= 0 && progress < trackLength(state) && trackIndex(seat.color, progress, state.seats.length > 4) === landing) {
            seat.tokens[index] = -1;
            captured = true;
          }
        });
      });
    }
  }
  const won = seats[state.turn].tokens.every(progress => progress === finishFor(state));
  if (won) return { ...state, seats, phase: 'finished', die: null, winner: player.color, event: 'win' };
  const event: LudoEvent = captured ? 'capture' : destination === finishFor(state) ? 'home' : 'move';
  const moved: LudoState = { ...state, seats, die: null, phase: 'roll', event };
  return die === 6 || captured || destination === finishFor(state) ? moved : nextTurn(moved, event);
}

export function chooseComputerToken(state: LudoState): number | null {
  if (state.phase !== 'choose' || state.seats[state.turn].kind !== 'computer' || state.die === null) return null;
  const options = legalTokens(state);
  if (!options.length) return null;
  const player = state.seats[state.turn];
  const die = state.die;
  const score = (index: number) => {
    const current = player.tokens[index];
    const destination = current === -1 ? 0 : current + die;
    const landing = destination < trackLength(state) ? trackIndex(player.color, destination, state.seats.length > 4) : -1;
    const capture = destination < trackLength(state) && !isSafe(landing, state.seats.length > 4) && state.seats.some((seat, seatIndex) =>
      seatIndex !== state.turn && seat.tokens.some(progress => progress >= 0 && progress < trackLength(state) && trackIndex(seat.color, progress, state.seats.length > 4) === landing));
    return (destination === finishFor(state) ? 1000 : 0) + (capture ? 500 : 0) + (current === -1 ? 150 : 0)
      + (isSafe(landing, state.seats.length > 4) ? 30 : 0) + destination;
  };
  return options.reduce((best, candidate) => score(candidate) > score(best) ? candidate : best);
}
