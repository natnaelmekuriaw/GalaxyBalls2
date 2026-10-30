import { StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import { getSnakeLevel, SNAKE_BONUS_TICKS, SNAKE_COMBO_TICKS, type SnakeState } from '../engine/snakeEngine';
import type { SnakeTranslationKey } from '../i18n/translations';
import { C } from '../theme';

export function SnakeHud({ game, best, compact, tr }: {
  game: SnakeState; best: number; compact: boolean;
  tr: (key: SnakeTranslationKey, values?: Record<string, string | number>) => string;
}) {
  const foods = game.body.length - 4;
  return <View style={[s.hud, compact && { gap: 5 }]}>
    <View style={s.scoreRow}>
      <View style={s.score}><Text style={s.label}>{tr('score')}</Text><Text testID="snake-score" style={[s.scoreValue, compact && { fontSize: 28, lineHeight: 34 }]}>{game.score.toLocaleString()}</Text></View>
      <View style={s.miniStat}><Text style={s.bestLabel}>★ {tr('best')}</Text><Text style={s.bestValue}>{best.toLocaleString()}</Text></View>
      <View style={s.statDivider} />
      <View style={s.miniStat}><Text style={s.label}>{tr('foods')}</Text><Text style={s.foodValue}>{foods}</Text></View>
    </View>
    <View style={s.progressRow}>
      <Text style={s.level}>{tr('level')} {getSnakeLevel(game)}</Text>
      <View style={s.levelDots}>{[0, 1, 2, 3, 4].map(index => <View key={index} style={[s.levelDot, index < foods % 5 && s.levelDotFilled]} />)}</View>
      <Text style={s.nextLevel}>{tr('levelProgress', { count: foods % 5 })}</Text>
    </View>
    {game.mode === 'ARCADE' && <View style={s.arcadeRow}>
      <View style={[s.chain, compact && { paddingVertical: 5 }, game.combo > 1 && s.chainActive]}>
        <Text style={[s.chainText, game.combo > 0 && { color: C.mint }]}>{tr('chainLabel', { count: Math.max(1, game.combo) })}</Text>
        <View style={s.timerTrack}><View style={[s.timerFill, { width: `${game.comboTicks / SNAKE_COMBO_TICKS * 100}%` }]} /></View>
      </View>
      <View style={[s.gold, compact && { paddingVertical: 5 }, !!game.bonus && s.goldActive]}>
        <Text numberOfLines={1} style={[s.goldText, !!game.bonus && { color: C.gold }]}>✦ {game.bonus ? `${tr('goldenFruit')} +50` : tr('nextLevel')}</Text>
        {game.bonus && <View style={s.timerTrack}><View style={[s.timerFill, { backgroundColor: C.gold, width: `${game.bonus.ticksLeft / SNAKE_BONUS_TICKS * 100}%` }]} /></View>}
      </View>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  hud: { width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 10, marginBottom: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 4 },
  score: { flex: 1 },
  label: { color: C.muted, fontSize: 11, fontWeight: '600' },
  scoreValue: { color: C.cream, fontSize: 38, lineHeight: 44, fontWeight: '900', fontVariant: ['tabular-nums'] },
  miniStat: { alignItems: 'flex-end', gap: 4, maxWidth: '32%' },
  bestLabel: { color: C.gold, fontSize: 11, fontWeight: '700' },
  bestValue: { color: C.cream, fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  foodValue: { color: C.coral, fontSize: 19, fontWeight: '800' },
  statDivider: { height: 30, width: 1, backgroundColor: C.line },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  level: { color: C.teal, fontSize: 11, fontWeight: '800' },
  levelDots: { flex: 1, flexDirection: 'row', gap: 4 },
  levelDot: { flex: 1, height: 3, backgroundColor: C.line, borderRadius: 2 },
  levelDotFilled: { backgroundColor: C.teal },
  nextLevel: { color: C.muted, fontSize: 10 },
  arcadeRow: { flexDirection: 'row', gap: 8 },
  chain: { width: '37%', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.panel, borderRadius: 12, gap: 5, borderWidth: 1, borderColor: C.line },
  chainActive: { borderColor: '#587541', backgroundColor: '#1D392C' },
  chainText: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  timerTrack: { height: 2, borderRadius: 1, backgroundColor: C.line, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: C.mint, borderRadius: 1 },
  gold: { flex: 1, justifyContent: 'center', backgroundColor: C.panel, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 5, borderWidth: 1, borderColor: C.line },
  goldActive: { borderColor: '#887347' },
  goldText: { color: C.muted, fontSize: 10, fontWeight: '700' },
});
