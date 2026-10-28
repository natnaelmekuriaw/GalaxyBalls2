import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { StartupSplash } from '@/shared/components/startup-splash';
import { LanguageProvider } from '@/shared/i18n/LanguageProvider';
import { AppDataProvider } from '@/providers/AppDataProvider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppDataProvider>
        <LanguageProvider>
          <StartupSplash />
          <Stack screenOptions={{ headerShown: false }} />
        </LanguageProvider>
      </AppDataProvider>
    </ThemeProvider>
  );
}
