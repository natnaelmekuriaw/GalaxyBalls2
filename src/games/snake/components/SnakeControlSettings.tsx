import { Pressable, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import type { SnakeControlSettings as ControlSettings } from '../controls/settings';
import type { SnakeTranslationKey } from '../i18n/translations';
import { C } from '../theme';

export function SnakeControlSettings({ settings, onChange, onArrange, tr }: {
  settings: ControlSettings;
  onChange: (patch: Partial<ControlSettings>) => void;
  onArrange: () => void;
  tr: (key: SnakeTranslationKey, values?: Record<string, string | number>) => string;
}) {
  return <View style={s.content}>
    <Text style={s.section}>{tr('controlStyle')}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={tr('controlStyle')} style={s.choices}>
      {(['BUTTONS', 'ANALOG'] as const).map(style => <Pressable key={style} accessibilityRole="radio"
        accessibilityLabel={tr(style === 'BUTTONS' ? 'buttons' : 'analog')} accessibilityState={{ checked: settings.style === style }}
        onPress={() => onChange({ style })} style={({ pressed }) => [s.choice, settings.style === style && s.selected, pressed && s.pressed]}>
        <View accessible={false} style={s.stylePreview}>
          {style === 'BUTTONS' ? <View style={s.miniPad}><View style={[s.miniKey, { left: 17, top: 0 }]} /><View style={[s.miniKey, { left: 0, top: 17 }]} /><View style={[s.miniKey, { left: 17, top: 17 }]} /><View style={[s.miniKey, { left: 34, top: 17 }]} /></View>
            : <View style={s.miniStick}><View style={s.miniThumb} /></View>}
        </View>
        <Text style={s.choiceText}>{tr(style === 'BUTTONS' ? 'buttons' : 'analog')}</Text>
        <View style={[s.radio, settings.style === style && s.radioSelected]} />
      </Pressable>)}
    </View>
    <Text style={s.help}>{tr(settings.style === 'ANALOG' ? 'analogHelp' : 'turnHelp')}</Text>
    <Text style={s.section}>{tr('controlSize')}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={tr('controlSize')} style={s.choices}>
      {(['LARGE', 'EXTRA_LARGE'] as const).map(size => <Pressable key={size} accessibilityRole="radio"
        accessibilityLabel={tr(size === 'LARGE' ? 'large' : 'extraLarge')} accessibilityState={{ checked: settings.size === size }}
        onPress={() => onChange({ size })} style={({ pressed }) => [s.sizeChoice, settings.size === size && s.selected, pressed && s.pressed]}>
        <Text style={s.choiceText}>{tr(size === 'LARGE' ? 'large' : 'extraLarge')}</Text>
        <Text style={s.measure}>{size === 'LARGE' ? '●' : '● ●'}</Text>
      </Pressable>)}
    </View>
    <View style={s.positionCard}>
      <Text style={s.positionTitle}>{settings.locked ? '◆' : '◇'} {tr(settings.locked ? 'positionLocked' : 'positionUnlocked')}</Text>
      <Text style={s.help}>{tr('controlsHelp')}</Text>
    </View>
    <Pressable accessibilityRole="button" onPress={onArrange} style={({ pressed }) => [s.arrange, pressed && s.pressed]}>
      <Text style={s.arrangeText}>✥ {tr('moveControls')}</Text><Text style={s.arrangeText}>↗</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={() => onChange({ position: { x: 1, y: 1 } })} style={s.reset}>
      <Text style={s.resetText}>↺ {tr('resetPosition')}</Text>
    </Pressable>
    <Text style={s.saved}>{tr('controlsSaved')}</Text>
  </View>;
}

const s = StyleSheet.create({
  content: { gap: 12 },
  section: { color: C.muted, fontSize: 12, fontWeight: '800' },
  choices: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, alignItems: 'center', padding: 14, gap: 9, borderRadius: 18, backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.line },
  selected: { borderColor: C.mint, backgroundColor: '#234334' },
  stylePreview: { height: 52, alignItems: 'center', justifyContent: 'center' },
  miniPad: { width: 50, height: 34 },
  miniKey: { position: 'absolute', width: 14, height: 14, borderRadius: 4, backgroundColor: C.mint },
  miniStick: { width: 46, height: 46, borderRadius: 24, borderWidth: 1, borderColor: '#739A6C', backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  miniThumb: { width: 25, height: 25, borderRadius: 13, backgroundColor: C.mint },
  choiceText: { color: C.cream, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  radio: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  radioSelected: { backgroundColor: C.mint },
  sizeChoice: { flex: 1, minHeight: 56, padding: 10, borderRadius: 14, backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 4 },
  measure: { color: C.mint, fontSize: 8 },
  help: { color: C.muted, fontSize: 12, lineHeight: 20 },
  positionCard: { gap: 8, backgroundColor: C.panelRaised, padding: 14, borderRadius: 16 },
  positionTitle: { color: C.teal, fontSize: 12, fontWeight: '800' },
  arrange: { minHeight: 52, backgroundColor: C.mint, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, gap: 8 },
  arrangeText: { color: C.bg, fontSize: 14, fontWeight: '900' },
  reset: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resetText: { color: C.cream, fontSize: 12, fontWeight: '700' },
  saved: { color: C.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
