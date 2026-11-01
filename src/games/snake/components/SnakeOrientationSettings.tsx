import { Pressable, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import type { SnakeTranslationKey } from '../i18n/translations';
import { C } from '../theme';

type Choice = 'AUTO' | 'PORTRAIT' | 'LANDSCAPE';
const LABELS = { AUTO: 'autoRotate', PORTRAIT: 'portrait', LANDSCAPE: 'landscape' } as const;

export function SnakeOrientationSettings({ requested, busy, unavailable, web, onChange, tr }: {
  requested: Choice; busy: boolean; unavailable: boolean; web: boolean;
  onChange: (choice: Choice) => void;
  tr: (key: SnakeTranslationKey) => string;
}) {
  return <View style={s.card}>
    <Text style={s.heading}>{tr('screenOrientation')}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={tr('screenOrientation')} style={s.choices}>
      {(['AUTO', 'PORTRAIT', 'LANDSCAPE'] as const).map(choice => <Pressable key={choice}
        accessibilityRole="radio" accessibilityLabel={tr(LABELS[choice])}
        accessibilityState={{ checked: requested === choice, disabled: busy }} disabled={busy}
        onPress={() => onChange(choice)} style={[s.choice, requested === choice && s.selected]}>
        <Text style={s.label}>{tr(LABELS[choice])}</Text>
      </Pressable>)}
    </View>
    {(web || unavailable) && <Text accessibilityLiveRegion="polite" style={s.hint}>
      {tr(web ? 'orientationHint' : 'orientationUnavailable')}
    </Text>}
  </View>;
}

const s = StyleSheet.create({
  card: { gap: 10, paddingTop: 8 },
  heading: { color: C.muted, fontSize: 12, fontWeight: '800' },
  choices: { flexDirection: 'row', gap: 6 },
  choice: { flex: 1, minHeight: 48, padding: 7, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.panelRaised, justifyContent: 'center' },
  selected: { borderColor: C.mint, backgroundColor: '#234334' },
  label: { color: C.cream, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  hint: { color: C.muted, fontSize: 12, lineHeight: 19 },
});
