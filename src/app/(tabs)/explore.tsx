import type { Metadata } from 'expo-router/server';

export { default } from '@/features/game-library/GamesScreen';

export function generateMetadata(): Metadata {
  return {
    title: 'Games | Galaxy Balls',
    description: 'Play Galaxy Balls, a colorful space puzzle with matching blocks and special clears.',
  };
}
