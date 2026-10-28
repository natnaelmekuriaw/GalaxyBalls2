import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import { SCORE_PER_LEVEL } from '@/games/galaxy-balls/engine/galaxyEngine';
import { getLevelProgress, type ResolutionFeedback } from '@/games/galaxy-balls/gameplay/feedback';
import { useLanguage } from '@/shared/i18n/LanguageProvider';

export function GameFeedback({ score, level, feedback }: { score: number; level: number; feedback: ResolutionFeedback | null }) {
  const { t } = useLanguage();
  const { fontScale } = useWindowDimensions();
  const progress = getLevelProgress(score, level, SCORE_PER_LEVEL);
  const title = feedback?.titles.map((message) => t(message.key, message.values)).join(' · ') ?? '';
  const detail = feedback ? [feedback.scope && t(feedback.scope.key), t(feedback.detail.key, feedback.detail.values)].filter(Boolean).join(' · ') : '';

  return (
    <View style={styles.container}>
      <View style={styles.levelRow}>
        <Text style={styles.level}>{t('level', { level })}</Text>
        <Text style={styles.progressLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {t('levelProgress', { points: progress.points, target: progress.target })}
        </Text>
      </View>
      <View
        testID="level-progress"
        accessibilityRole="progressbar"
        accessibilityLabel={t('nextLevel', { level: level + 1 })}
        accessibilityValue={{ min: 0, max: progress.target, now: progress.points }}
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={progress.points}
        style={styles.track}>
        <View style={[styles.fill, { width: `${progress.fraction * 100}%` }]} />
      </View>
      <View
        testID="resolution-feedback"
        accessibilityLiveRegion="polite"
        aria-live="polite"
        accessibilityLabel={feedback ? `${title}. ${detail}` : undefined}
        style={[styles.event, { height: 44 * fontScale }]}>
        {feedback ? (
          <>
            <Text style={[styles.title, { color: feedback.color }]} numberOfLines={2}>{feedback.icon} {title}</Text>
            <Text style={styles.detail} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{detail}</Text>
          </>
        ) : <Text style={styles.hint} numberOfLines={2}>{t('holdControlsHint')}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 4, gap: 4 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  level: { color: '#FDE68A', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  progressLabel: { flex: 1, textAlign: 'right', color: '#CBD5E1', fontSize: 10, lineHeight: 16 },
  track: { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#F5A623' },
  event: { justifyContent: 'center', gap: 2 },
  title: { fontSize: 11, lineHeight: 12, fontWeight: '800', textAlign: 'center' },
  detail: { color: '#F8FAFC', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  hint: { color: '#94A3B8', fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
