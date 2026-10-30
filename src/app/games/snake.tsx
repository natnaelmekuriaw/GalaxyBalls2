import type { Metadata } from 'expo-router/server';

import SnakeScreen from '@/games/snake/SnakeScreen';
import { SnakeDataProvider } from '@/games/snake/data/SnakeDataProvider';

export function generateMetadata(): Metadata {
  return { title: 'Snake | Galaxy Balls', description: 'Eat, grow, and beat your best score in classic Snake.' };
}

export default function SnakeRoute() {
  return <SnakeDataProvider><SnakeScreen /></SnakeDataProvider>;
}
