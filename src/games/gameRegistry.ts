import type { Href } from 'expo-router';

import type { TranslationKey } from '@/shared/i18n/translations';

export type GameDefinition = {
  id: string;
  title: string;
  icon?: number;
  descriptionKey: TranslationKey;
} & ({ status: 'available'; href: Href; openLabelKey: TranslationKey }
  | { status: 'comingLater'; href?: never; openLabelKey?: never });

export const GAME_REGISTRY = [
  {
    id: 'galaxy-balls',
    status: 'available',
    title: 'Galaxy Balls',
    href: '/',
    icon: require('@/assets/branding/galaxy-balls-icon.png'),
    descriptionKey: 'galaxyBallsDescription',
    openLabelKey: 'openGalaxyBalls',
  },
  {
    id: 'snake',
    status: 'available',
    title: 'Snake',
    href: '/games/snake',
    icon: require('@/assets/games/snake/icon.png'),
    descriptionKey: 'snakeDescription',
    openLabelKey: 'openSnake',
  },
  {
    id: 'ludo',
    status: 'comingLater',
    title: 'Ludo',
    descriptionKey: 'ludoDescription',
  },
] as const satisfies readonly GameDefinition[];
