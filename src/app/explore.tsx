import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameText as Text } from '@/components/game-text';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function GamesScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 24, Platform.OS === 'web' ? 88 : 24), paddingBottom: insets.bottom + 32 },
      ]}>
      <View style={styles.collection}>
        <Text accessibilityRole="header" style={styles.heading}>{t('otherGames')}</Text>
        <Text style={styles.intro}>{t('gamesHint')}</Text>

        <View style={styles.gameCard}>
          <View style={styles.blocks} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.block, { backgroundColor: '#1565C0' }]}><Text style={styles.symbol}>◆</Text></View>
            <View style={[styles.block, { backgroundColor: '#2E9E28' }]}><Text style={styles.symbol}>●</Text></View>
            <View style={[styles.block, { backgroundColor: '#D32F2F' }]}><Text style={styles.symbol}>★</Text></View>
          </View>
          <Text style={styles.badge}>{t('availableNow')}</Text>
          <Text style={styles.gameName}>Galaxy Balls</Text>
          <Text style={styles.description}>{t('galaxyBallsDescription')}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.openButton}
            onPress={() => router.navigate('/')}>
            <Text style={styles.openLabel}>{t('openGalaxyBalls')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => router.navigate('/')}>
          <Text style={styles.backLabel}>◀ {t('backToMenu')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020412' },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 22 },
  collection: { width: '100%', maxWidth: 420, gap: 18 },
  heading: { color: '#FDE68A', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  intro: { color: '#CBD5E1', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  gameCard: { backgroundColor: '#0F172A', borderColor: '#475569', borderWidth: 1, borderRadius: 20, padding: 22, gap: 14 },
  blocks: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  block: { width: 48, height: 48, borderRadius: 10, borderColor: '#FFFFFF66', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  symbol: { color: '#FFFFFF', fontSize: 25 },
  badge: { color: '#A7F3D0', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  gameName: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  description: { color: '#CBD5E1', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  openButton: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: '#F59B1A', alignItems: 'center', justifyContent: 'center' },
  openLabel: { color: '#1C1917', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  backButton: { minHeight: 48, padding: 14, borderRadius: 12, borderColor: '#475569', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
