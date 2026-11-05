import { THEME_IDS, type BoardThemeId } from '../board/themes.ts';
export const LUDO_PREFERENCES_KEY = '@ludo/preferences';
export type LudoPreferences = { theme: BoardThemeId; sound: boolean; music: boolean; humans: number; computers: number };
export const DEFAULT_PREFERENCES: LudoPreferences = { theme: 'classic', sound: true, music: true, humans: 1, computers: 1 };
export function parsePreferences(raw: string | null): LudoPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    const validSetup = Number.isInteger(value?.humans) && Number.isInteger(value?.computers)
      && value.humans >= 1 && value.computers >= 0 && value.humans + value.computers >= 2 && value.humans + value.computers <= 6;
    if (!value || typeof value !== 'object') return { ...DEFAULT_PREFERENCES };
    return { theme: THEME_IDS.includes(value.theme) ? value.theme : 'classic',
      sound: typeof value.sound === 'boolean' ? value.sound : true,
      music: typeof value.music === 'boolean' ? value.music : true,
      humans: validSetup ? value.humans : 1,
      computers: validSetup ? value.computers : 1 };
  } catch { return { ...DEFAULT_PREFERENCES }; }
}
