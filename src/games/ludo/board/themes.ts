import type { LudoColor } from '../engine/ludoEngine';

export const THEME_IDS = ['classic', 'jewel', 'garden', 'pastel'] as const;
export type BoardThemeId = typeof THEME_IDS[number];
export type BoardTheme = { id: BoardThemeId; paper: string; ink: string; frame: string; inset: string;
  colors: Record<LudoColor, string>; round: boolean; flat: boolean };
export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  classic: { id: 'classic', paper: '#FFFFFF', ink: '#202020', frame: '#202020', inset: '#FFFFFF',
    colors: { red: '#F5090A', green: '#00A51B', yellow: '#FFE000', blue: '#04AFE1', purple: '#9138C6', orange: '#F58216' }, round: false, flat: true },
  jewel: { id: 'jewel', paper: '#152B29', ink: '#BFA45E', frame: '#D7B66A', inset: '#102C29',
    colors: { red: '#A92F3E', green: '#168A6F', yellow: '#DBA844', blue: '#3156B8', purple: '#8053B2', orange: '#CB702C' }, round: false, flat: false },
  garden: { id: 'garden', paper: '#FFF0CC', ink: '#8B7850', frame: '#A88145', inset: '#F6E7BC',
    colors: { red: '#C76E62', green: '#819C66', yellow: '#E6B83F', blue: '#5F9BBA', purple: '#AE83AF', orange: '#DC9358' }, round: false, flat: true },
  pastel: { id: 'pastel', paper: '#FFFCF5', ink: '#A3A6A0', frame: '#E1D8C6', inset: '#FFFCF5',
    colors: { red: '#EAA3A4', green: '#80CBB9', yellow: '#F3DC73', blue: '#8FCBE2', purple: '#C4ABE2', orange: '#EDBA93' }, round: true, flat: true },
};
