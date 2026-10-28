import { createContext, useContext } from 'react';

import type { AppPreferences } from './appPreferences';

export type AppPreferencesContextValue = AppPreferences & {
  setLanguage: (value: AppPreferences['language']) => void;
  setSoundsEnabled: (value: boolean) => void;
  setMenuMusicEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  saveFailed: boolean;
};

export const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) throw new Error('useAppPreferences must be used inside AppDataProvider');
  return context;
}
