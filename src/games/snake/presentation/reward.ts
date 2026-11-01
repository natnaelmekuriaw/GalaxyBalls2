import { getSnakeLevel, type Point, type SnakeState } from '../engine/snakeEngine.ts';

export type SnakePickupReward = {
  kind: 'food' | 'bonus' | 'level';
  points: number;
  position: Point;
  sounds: ('eat' | 'bonus' | 'level')[];
};

/** Rewards follow actual pickups, so restoring or pausing a run cannot replay one. */
export function getSnakePickupReward(previous: SnakeState, next: SnakeState): SnakePickupReward | null {
  if (previous.status !== 'PLAYING' || (next.status !== 'PLAYING' && next.status !== 'WON')) return null;
  const berry = next.body.length > previous.body.length;
  const bonus = next.bonusCollected > previous.bonusCollected;
  if (!berry && !bonus) return null;
  const level = getSnakeLevel(next) > getSnakeLevel(previous);
  return {
    kind: level ? 'level' : bonus ? 'bonus' : 'food',
    points: next.score - previous.score,
    position: { ...next.body[0] },
    // The final berry keeps its pop, while the victory cue takes the fanfare's place.
    sounds: bonus ? ['bonus'] : level && next.status !== 'WON' ? ['eat', 'level'] : ['eat'],
  };
}
