import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameText as Text } from '@/shared/components/game-text';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import type { TranslationKey } from '@/shared/i18n/translations';
import { GAME_REGISTRY, type GameDefinition } from '@/games/gameRegistry';

type ViewMode = 'compact' | 'cards';
type Tr = (key: TranslationKey) => string;

function GameArtwork({ game, size }: { game: GameDefinition; size: number }) {
  if (game.icon) return <Image source={game.icon} style={{ width: size, height: size, borderRadius: size * 0.2 }}
    contentFit="contain" accessible={false} />;

  return <View accessible={false} style={[styles.ludoIcon, { width: size, height: size, borderRadius: size * 0.2 }]}>
    {['#F87272', '#62D5A5', '#F9CF70', '#73B9F3'].map(color =>
      <View key={color} style={[styles.ludoCorner, { backgroundColor: color }]}><View style={styles.ludoToken} /></View>)}
    <View style={styles.ludoCenter} />
  </View>;
}

function CompactGame({ game, tr }: { game: GameDefinition; tr: Tr }) {
  const content = <>
    <GameArtwork game={game} size={54} />
    <View style={styles.compactDetails}>
      <Text numberOfLines={1} style={styles.compactName}>{game.title}</Text>
      <Text numberOfLines={1} style={styles.compactDescription}>{tr(game.descriptionKey)}</Text>
    </View>
    {game.status === 'available' ? <Text style={styles.chevron}>›</Text>
      : <Text style={styles.comingLabel}>{tr('comingLater')}</Text>}
  </>;
  return game.status === 'available'
    ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={tr(game.openLabelKey)}
      onPress={() => router.navigate(game.href)} style={styles.compactRow}>{content}</TouchableOpacity>
    : <View style={styles.compactRow}>{content}</View>;
}

function CardGame({ game, tr }: { game: GameDefinition; tr: Tr }) {
  return <View style={styles.gameCard}>
    <View style={styles.cardArtwork}><GameArtwork game={game} size={96} /></View>
    <Text style={[styles.badge, game.status === 'comingLater' && styles.comingBadge]}>
      {tr(game.status === 'available' ? 'availableNow' : 'comingLater')}
    </Text>
    <Text style={styles.gameName}>{game.title}</Text>
    <Text style={styles.description}>{tr(game.descriptionKey)}</Text>
    {game.status === 'available' && <TouchableOpacity accessibilityRole="button" style={styles.openButton}
      onPress={() => router.navigate(game.href)}>
      <Text style={styles.openLabel}>{tr(game.openLabelKey)}</Text>
    </TouchableOpacity>}
  </View>;
}

export default function GamesScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('compact');

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, {
    paddingTop: Math.max(insets.top + 16, Platform.OS === 'web' ? 72 : 16),
    paddingBottom: insets.bottom + 24,
  }]}>
    <View style={[styles.collection, viewMode === 'cards' && styles.cardCollection]}>
      <Text accessibilityRole="header" style={styles.heading}>{t('otherGames')}</Text>
      <Text style={styles.intro}>{t('gamesHint')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('gameViewMode')} style={styles.viewPicker}>
        {(['compact', 'cards'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio"
          accessibilityState={{ checked: viewMode === mode }} accessibilityLabel={t(mode === 'compact' ? 'compactView' : 'cardView')}
          onPress={() => setViewMode(mode)} style={[styles.viewOption, viewMode === mode && styles.viewOptionActive]}>
          <Text style={[styles.viewOptionText, viewMode === mode && styles.viewOptionTextActive]}>
            {mode === 'compact' ? '☷' : '▦'}  {t(mode === 'compact' ? 'compactView' : 'cardView')}
          </Text>
        </Pressable>)}
      </View>

      <View style={styles.gameList}>
        {GAME_REGISTRY.map(game => viewMode === 'compact'
          ? <CompactGame key={game.id} game={game} tr={t} />
          : <CardGame key={game.id} game={game} tr={t} />)}
      </View>

      <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.navigate('/')}>
        <Text style={styles.backLabel}>◀ {t('backToMenu')}</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020412' },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 16 },
  collection: { width: '100%', maxWidth: 560, gap: 12 },
  cardCollection: { maxWidth: 420, gap: 16 },
  heading: { color: '#FDE68A', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  intro: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  viewPicker: { flexDirection: 'row', alignSelf: 'center', padding: 3, borderRadius: 13,
    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#475569' },
  viewOption: { minHeight: 40, minWidth: 108, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  viewOptionActive: { backgroundColor: '#F59B1A' },
  viewOptionText: { color: '#CBD5E1', fontSize: 13, fontWeight: '800' },
  viewOptionTextActive: { color: '#1C1917' },
  gameList: { gap: 10 },
  compactRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0F172A', borderColor: '#475569', borderWidth: 1, borderRadius: 16, padding: 10 },
  compactDetails: { flex: 1, minWidth: 0, gap: 3 },
  compactName: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  compactDescription: { color: '#CBD5E1', fontSize: 12, lineHeight: 16 },
  chevron: { color: '#F59B1A', fontSize: 28, fontWeight: '800', paddingHorizontal: 3 },
  comingLabel: { color: '#FDE68A', fontSize: 11, fontWeight: '800', maxWidth: 72, textAlign: 'right' },
  gameCard: { backgroundColor: '#0F172A', borderColor: '#475569', borderWidth: 1, borderRadius: 20, padding: 22, gap: 14 },
  cardArtwork: { alignItems: 'center' },
  badge: { color: '#A7F3D0', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  comingBadge: { color: '#FDE68A' },
  gameName: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  description: { color: '#CBD5E1', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  openButton: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: '#F59B1A', alignItems: 'center', justifyContent: 'center' },
  openLabel: { color: '#1C1917', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  backButton: { minHeight: 48, padding: 14, borderRadius: 12, borderColor: '#475569', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  ludoIcon: { flexDirection: 'row', flexWrap: 'wrap', padding: 4, gap: 2, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  ludoCorner: { width: '48%', height: '48%', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  ludoToken: { width: '46%', height: '46%', borderRadius: 30, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#FFFFFF99' },
  ludoCenter: { position: 'absolute', width: '18%', height: '18%', left: '41%', top: '41%',
    backgroundColor: '#FFFFFF', borderRadius: 3, transform: [{ rotate: '45deg' }] },
});
