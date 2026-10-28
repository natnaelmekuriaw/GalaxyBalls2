import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { StartupSplash } from '@/components/startup-splash';
import AppTabs from '@/components/app-tabs';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { GameDataProvider } from '@/data/GameDataProvider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GameDataProvider>
        <LanguageProvider>
          <StartupSplash />
          <AppTabs />
        </LanguageProvider>
      </GameDataProvider>
    </ThemeProvider>
  );
}
