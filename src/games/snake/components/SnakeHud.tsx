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
  const score = game.score.toLocaleString();
  const bestScore = best.toLocaleString();
  const chain = Math.max(1, game.combo);
  return <View testID="snake-hud" style={[s.hud, compact && s.compactHud]}>
    <View style={[s.scoreRow, compact && s.compactScoreRow]}>
      <Text accessibilityLabel={`${tr('score')} ${score}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
        style={[s.score, compact && s.compactScore]}>
        {!compact && <Text style={s.statLabel}>{tr('score')} </Text>}<Text testID="snake-score">{score}</Text>
      </Text>
      <Text accessibilityLabel={`${tr('best')} ${bestScore}`} numberOfLines={1} style={s.best}>
        <Text style={s.bestStar}>★ </Text>{bestScore}
      </Text>
      <Text accessibilityLabel={`${tr('foods')} ${foods}`} numberOfLines={1} style={s.fruit}>
        <Text style={compact ? s.berry : s.statLabel}>{compact ? '● ' : `${tr('foods')} `}</Text>{foods}
      </Text>
    </View>
    <View style={[s.progressRow, compact && s.compactProgressRow]}>
      <Text numberOfLines={1} style={s.level}>{tr('level')} {getSnakeLevel(game)}</Text>
      <View accessible={false} style={[s.levelDots, compact && s.compactLevelDots]}>
        {[0, 1, 2, 3, 4].map(index => <View key={index} style={[s.levelDot, index < foods % 5 && s.levelDotFilled]} />)}
      </View>
      <Text style={s.nextLevel}>{tr('levelProgress', { count: foods % 5 })}</Text>
      {game.mode === 'ARCADE' && <View accessible accessibilityLabel={tr('chainLabel', { count: chain })} style={s.chain}>
        <Text style={[s.chainText, game.combo > 1 && s.activeChain]}>{chain}×</Text>
        <View style={s.timerTrack}><View style={[s.timerFill, { width: `${game.comboTicks / SNAKE_COMBO_TICKS * 100}%` }]} /></View>
      </View>}
      {game.bonus && <View accessible accessibilityLabel={tr('goldenHint')} style={s.gold}>
        <Text style={s.goldText}>✦ +50</Text>
        <View style={s.timerTrack}><View style={[s.timerFill, { backgroundColor: C.gold, width: `${game.bonus.ticksLeft / SNAKE_BONUS_TICKS * 100}%` }]} /></View>
      </View>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  hud: { width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 4, marginBottom: 4, paddingHorizontal: 4 },
  compactHud: { gap: 2, marginBottom: 2 },
  scoreRow: { height: 28, flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactScoreRow: { height: 24, gap: 8 },
  score: { flex: 1, minWidth: 0, color: C.cream, fontSize: 24, lineHeight: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  compactScore: { fontSize: 22, lineHeight: 24 },
  best: { maxWidth: '30%', color: C.cream, fontSize: 14, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bestStar: { color: C.gold, fontSize: 11 },
  fruit: { maxWidth: '30%', color: C.coral, fontSize: 14, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  berry: { color: C.coral, fontSize: 9 },
  statLabel: { color: C.muted, fontSize: 10, fontWeight: '600' },
  progressRow: { height: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactProgressRow: { height: 16, gap: 4 },
  level: { flexShrink: 0, color: C.teal, fontSize: 10, lineHeight: 14, fontWeight: '800' },
  levelDots: { flex: 1, minWidth: 24, flexDirection: 'row', gap: 3 },
  compactLevelDots: { minWidth: 12, gap: 1 },
  levelDot: { flex: 1, height: 3, backgroundColor: C.line, borderRadius: 2 },
  levelDotFilled: { backgroundColor: C.teal },
  nextLevel: { color: C.muted, fontSize: 9, lineHeight: 14 },
  chain: { width: 21, height: 16, justifyContent: 'center', gap: 1 },
  chainText: { color: C.muted, fontSize: 10, lineHeight: 12, textAlign: 'center', fontWeight: '800' },
  activeChain: { color: C.mint },
  timerTrack: { height: 2, borderRadius: 1, backgroundColor: C.line, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: C.mint, borderRadius: 1 },
  gold: { width: 38, height: 16, justifyContent: 'center', gap: 1 },
  goldText: { color: C.gold, fontSize: 9, lineHeight: 12, textAlign: 'center', fontWeight: '800' },
});
