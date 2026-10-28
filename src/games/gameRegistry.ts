import type { Href } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';

import type { TranslationKey } from '@/shared/i18n/translations';

export type GameDefinition = {
  id: string;
  title: string;
  href: Href;
  icon: ImageSourcePropType;
  descriptionKey: TranslationKey;
  openLabelKey: TranslationKey;
};

export const GAME_REGISTRY = [
  {
    id: 'galaxy-balls',
    title: 'Galaxy Balls',
    href: '/',
    icon: require('@/assets/branding/galaxy-balls-icon.png'),
    descriptionKey: 'galaxyBallsDescription',
    openLabelKey: 'openGalaxyBalls',
  },
] as const satisfies readonly GameDefinition[];
