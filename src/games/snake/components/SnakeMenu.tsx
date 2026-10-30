import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import { SNAKE_DIFFICULTIES, SNAKE_MODES, type SnakeDifficulty, type SnakeMode, type SnakeState } from '../engine/snakeEngine';
import type { SnakeTranslationKey } from '../i18n/translations';
import { C } from '../theme';
import { SnakeHero } from './SnakeHero';

type Tr = (key: SnakeTranslationKey, values?: Record<string, string | number>) => string;
export const paceKey: Record<SnakeDifficulty, SnakeTranslationKey> = { EASY: 'easy', NORMAL: 'normal', FAST: 'fast' };
export const modeKey: Record<SnakeMode, SnakeTranslationKey> = { CLASSIC: 'classic', ARCADE: 'arcade' };

export function SnakeMenu({ mode, pace, best, currentGame, rulesOpen, reducedMotion, compact, tr, onMode, onPace, onResume, onNew, onRules }: {
  mode: SnakeMode; pace: SnakeDifficulty; best: number; currentGame: SnakeState | null;
  rulesOpen: boolean; reducedMotion: boolean; compact: boolean; tr: Tr;
  onMode: (mode: SnakeMode) => void; onPace: (pace: SnakeDifficulty) => void;
  onResume: () => void; onNew: () => void; onRules: () => void;
}) {
  return <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.menu}>
      <View style={s.intro}>
        <View style={s.eyebrowRow}><View style={s.eyebrowLine} /><Text style={s.eyebrow}>{tr('nightGarden')}</Text></View>
        <Text accessibilityRole="header" style={s.title}>{tr('title')}</Text>
        <Text style={s.tagline}>{tr('tagline')}</Text>
      </View>
      <SnakeHero compact={compact} reducedMotion={reducedMotion} />
      <View style={s.sectionHeading}>
        <Text style={s.label}>{tr('chooseMode')}</Text>
        <View style={s.record}><Text style={s.recordLabel}>★ {tr('best')}</Text><Text style={s.recordValue}>{best}</Text></View>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={tr('mode')} style={s.modes}>
        {SNAKE_MODES.map(item => {
          const selected = item === mode;
          return <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: selected }}
            accessibilityLabel={tr(modeKey[item])} onPress={() => onMode(item)}
            style={({ pressed }) => [s.mode, selected && s.modeSelected, pressed && s.pressed]}>
            <View style={s.modeTop}><Text style={[s.modeIcon, item === 'ARCADE' && { color: C.coral }]}>{item === 'CLASSIC' ? '○' : '✦'}</Text>
              <View style={[s.radioDot, selected && s.radioDotSelected]}>{selected && <View style={s.radioDotCenter} />}</View>
            </View>
            <Text style={s.modeTitle}>{tr(modeKey[item])}</Text>
            <Text style={s.modeDescription}>{tr(item === 'CLASSIC' ? 'classicDescription' : 'arcadeDescription')}</Text>
          </Pressable>;
        })}
      </View>
      <View style={s.paceRow}>
        <Text style={s.label}>{tr('difficulty')}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={tr('difficulty')} style={s.paces}>
          {SNAKE_DIFFICULTIES.map((item, index) => <Pressable key={item} accessibilityRole="radio"
            accessibilityState={{ checked: pace === item }} accessibilityLabel={tr(paceKey[item])} onPress={() => onPace(item)}
            style={({ pressed }) => [s.pace, pace === item && s.paceSelected, pressed && s.pressed]}>
            <View accessible={false} style={s.speedDots}>{[0, 1, 2].map(dot => <View key={dot} style={[s.speedDot, dot <= index && { backgroundColor: pace === item ? C.mint : C.muted }]} />)}</View>
            <Text style={[s.paceText, pace === item && { color: C.cream }]}>{tr(paceKey[item])}</Text>
          </Pressable>)}
        </View>
      </View>
      {currentGame ? <>
        <Pressable accessibilityRole="button" onPress={onResume} style={({ pressed }) => [s.play, pressed && s.pressed]}>
          <View style={s.playCopy}><Text style={s.playText}>{tr('resumeRun', { mode: tr(modeKey[currentGame.mode]) })}</Text>
            <Text style={s.resumeDetail}>{tr(paceKey[currentGame.difficulty])} · {tr('runSummary', { foods: currentGame.body.length - 4, level: Math.floor((currentGame.body.length - 4) / 5) + 1 })}</Text>
          </View><Text style={s.playArrow}>↗</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onNew} style={({ pressed }) => [s.newGame, pressed && s.pressed]}>
          <Text style={s.newGameText}>＋ {tr('newGame')}</Text>
        </Pressable>
      </> : <Pressable accessibilityRole="button" onPress={onNew} style={({ pressed }) => [s.play, pressed && s.pressed]}>
        <Text style={s.playText}>{tr('playMode', { mode: tr(modeKey[mode]) })}</Text><Text style={s.playArrow}>↗</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }} onPress={onRules} style={s.rulesToggle}>
        <Text style={s.rulesToggleText}>{tr('howToPlay')}</Text><Text style={s.rulesToggleSign}>{rulesOpen ? '−' : '+'}</Text>
      </Pressable>
      {rulesOpen && <View style={s.rules}>
        <Text style={s.ruleText}>{tr(mode === 'ARCADE' ? 'arcadeRules' : 'classicRules')}</Text>
        {mode === 'ARCADE' && <>
          <View style={s.ruleLine}><Text style={s.ruleGlyph}>×3</Text><Text style={s.ruleText}>{tr('comboHint')}</Text></View>
          <View style={s.ruleLine}><Text style={[s.ruleGlyph, { color: C.gold }]}>✦</Text><Text style={s.ruleText}>{tr('goldenHint')}</Text></View>
        </>}
        <Text style={s.ruleText}>{tr('swipeHint')}</Text>
      </View>}
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  menu: { width: '100%', maxWidth: 430, gap: 14, paddingHorizontal: 4 },
  intro: { gap: 4 },
  eyebrowRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  eyebrowLine: { height: 2, width: 24, backgroundColor: C.teal },
  eyebrow: { color: C.teal, fontSize: 10, letterSpacing: 2.1, fontWeight: '800' },
  title: { color: C.cream, fontSize: 58, fontWeight: '900', letterSpacing: -2, lineHeight: 72 },
  tagline: { color: C.muted, fontSize: 15, lineHeight: 24 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: C.muted, fontSize: 12, fontWeight: '700' },
  record: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordLabel: { color: C.gold, fontSize: 11, fontWeight: '700' },
  recordValue: { color: C.cream, fontSize: 19, fontWeight: '900', fontVariant: ['tabular-nums'] },
  modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, padding: 14, gap: 6, backgroundColor: C.panel, borderWidth: 1.5, borderColor: C.line, borderRadius: 20 },
  modeSelected: { backgroundColor: C.panelRaised, borderColor: C.mint },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeIcon: { color: C.teal, fontSize: 25, fontWeight: '700' },
  radioDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#527065', alignItems: 'center', justifyContent: 'center' },
  radioDotSelected: { borderColor: C.mint },
  radioDotCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.mint },
  modeTitle: { color: C.cream, fontSize: 18, fontWeight: '900' },
  modeDescription: { color: C.muted, fontSize: 12, lineHeight: 18 },
  paceRow: { gap: 9 },
  paces: { flexDirection: 'row', gap: 8 },
  pace: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 4 },
  paceSelected: { backgroundColor: C.panelRaised, borderColor: '#70984A' },
  speedDots: { flexDirection: 'row', gap: 3 },
  speedDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.line },
  paceText: { color: C.muted, fontSize: 12, fontWeight: '800' },
  play: { backgroundColor: C.mint, minHeight: 58, borderRadius: 19, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  playCopy: { flex: 1, gap: 4 },
  playText: { color: C.bg, fontSize: 19, fontWeight: '900', flexShrink: 1 },
  playArrow: { color: C.bg, fontSize: 27, fontWeight: '600' },
  resumeDetail: { color: '#365136', fontSize: 11, lineHeight: 16 },
  newGame: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 10 },
  newGameText: { color: C.cream, fontSize: 13, fontWeight: '700' },
  rulesToggle: { minHeight: 44, borderBottomWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  rulesToggleText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  rulesToggleSign: { color: C.teal, fontSize: 22 },
  rules: { gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.panel },
  ruleLine: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  ruleGlyph: { width: 30, color: C.mint, fontSize: 18, fontWeight: '900' },
  ruleText: { color: C.muted, fontSize: 13, lineHeight: 21, flexShrink: 1 },
  pressed: { opacity: 0.78 },
});
