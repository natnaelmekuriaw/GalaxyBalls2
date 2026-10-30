import type { Metadata } from 'expo-router/server';

import SnakeScreen from '@/games/snake/SnakeScreen';
import { SnakeDataProvider } from '@/games/snake/data/SnakeDataProvider';

export function generateMetadata(): Metadata {
  return { title: 'Snake | Galaxy Balls', description: 'Classic and Arcade Snake in a night garden, with fruit chains and golden bonuses.' };
}

export default function SnakeRoute() {
  return <SnakeDataProvider><SnakeScreen /></SnakeDataProvider>;
}
