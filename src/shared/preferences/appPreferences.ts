import type { Language } from '../i18n/translations';

export interface AppPreferences {
  language: Language;
  soundsEnabled: boolean;
  menuMusicEnabled: boolean;
  hapticsEnabled: boolean;
}

export function createDefaultAppPreferences(): AppPreferences {
  return { language: 'en', soundsEnabled: true, menuMusicEnabled: true, hapticsEnabled: true };
}

export function parseAppPreferences(saved: Record<string, unknown>): AppPreferences {
  const preferences = createDefaultAppPreferences();
  if (saved.language === 'en' || saved.language === 'am' || saved.language === 'om') preferences.language = saved.language;
  if (typeof saved.soundsEnabled === 'boolean') preferences.soundsEnabled = saved.soundsEnabled;
  if (typeof saved.menuMusicEnabled === 'boolean') preferences.menuMusicEnabled = saved.menuMusicEnabled;
  if (typeof saved.hapticsEnabled === 'boolean') preferences.hapticsEnabled = saved.hapticsEnabled;
  return preferences;
}
