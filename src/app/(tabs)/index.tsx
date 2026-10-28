import type { Metadata } from 'expo-router/server';

export { default } from '@/games/galaxy-balls/GalaxyBallsScreen';

export function generateMetadata(): Metadata {
  return {
    title: 'Galaxy Balls',
    description: 'Match colorful blocks, trigger special clears, and chase your best score in Galaxy Balls.',
  };
}
