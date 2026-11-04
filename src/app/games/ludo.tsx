import type { Metadata } from 'expo-router/server';

import LudoScreen from '@/games/ludo/LudoScreen';

export function generateMetadata(): Metadata {
  return { title: 'Ludo | Galaxy Balls', description: 'Play Ludo locally with friends or against the computer.' };
}

export default LudoScreen;
