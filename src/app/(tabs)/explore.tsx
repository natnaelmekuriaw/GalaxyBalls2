import type { Metadata } from 'expo-router/server';

export { default } from '@/features/game-library/GamesScreen';

export function generateMetadata(): Metadata {
  return {
    title: 'Games | Galaxy Balls',
    description: 'Play Galaxy Balls and Snake. Preview Ludo in the game library.',
  };
}
