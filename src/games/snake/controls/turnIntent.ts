import { queueDirection, type Direction, type SnakeState } from '../engine/snakeEngine.ts';

/** A countdown can accept the first turn without advancing the paused run. */
export function queueControlDirection(state: SnakeState, direction: Direction, countdownActive: boolean): SnakeState {
  if (state.status !== 'PAUSED' || !countdownActive) return queueDirection(state, direction);
  const playing: SnakeState = { ...state, status: 'PLAYING' };
  const queued = queueDirection(playing, direction);
  return queued === playing ? state : { ...queued, status: 'PAUSED' };
}
