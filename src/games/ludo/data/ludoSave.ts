import { FINISH, LUDO_COLORS, legalTokens, type LudoColor, type LudoEvent, type LudoState } from '../engine/ludoEngine.ts';

export const LUDO_SAVE_KEY = '@ludo/current-match';
const EVENTS: LudoEvent[] = ['new', 'roll', 'noMove', 'threeSixes', 'capture', 'home', 'move', 'win'];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integer(value: unknown, low: number, high: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
}

export function parseLudoSave(raw: string | null): LudoState | null {
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!record(value) || value.version !== 1 || !Array.isArray(value.seats)
    || value.seats.length < 2 || value.seats.length > 4
    || !integer(value.turn, 0, value.seats.length - 1)
    || !integer(value.seed, 0, 4294967295)
    || !integer(value.sixes, 0, 2)
    || (value.phase !== 'roll' && value.phase !== 'choose' && value.phase !== 'finished')
    || !EVENTS.includes(value.event as LudoEvent)
    || (value.lastRoll !== null && !integer(value.lastRoll, 1, 6))
    || (value.phase === 'choose' ? !integer(value.die, 1, 6) : value.die !== null)) return null;
  const expectedColors = value.seats.length === 2 ? ['red', 'yellow'] : LUDO_COLORS.slice(0, value.seats.length);
  const seats = value.seats;
  if (!seats.every((seat, index) => record(seat) && seat.color === expectedColors[index]
    && (seat.kind === 'human' || seat.kind === 'computer')
    && Array.isArray(seat.tokens) && seat.tokens.length === 4
    && seat.tokens.every((progress: unknown) => integer(progress, -1, FINISH)))
    || !seats.some(seat => seat.kind === 'human')) return null;
  const winner = value.winner;
  if (value.phase === 'finished'
    ? !LUDO_COLORS.includes(winner as LudoColor) || !seats.some(seat => seat.color === winner && seat.tokens.every((progress: number) => progress === FINISH))
    : winner !== null) return null;
  const game = value as LudoState;
  if (game.phase === 'choose' && legalTokens(game).length === 0) return null;
  return game;
}
