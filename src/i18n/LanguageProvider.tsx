import { useFonts } from 'expo-font';
import { createContext, useCallback, useContext, useMemo, type PropsWithChildren } from 'react';

import { useGameData } from '@/data/GameDataProvider';

import { translate, type Language, type TranslationKey } from './translations';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  fontsLoaded: boolean;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const { language, setLanguage } = useGameData();
  const [fontsLoaded] = useFonts({
    NotoSansEthiopic: require('../../assets/fonts/NotoSansEthiopic-Regular.ttf'),
    NotoSansEthiopicBold: require('../../assets/fonts/NotoSansEthiopic-Bold.ttf'),
  });
  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values),
    [language],
  );
  const value = useMemo(() => ({ language, setLanguage, fontsLoaded, t }), [language, setLanguage, fontsLoaded, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
