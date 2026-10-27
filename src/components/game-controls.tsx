import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GameText as Text } from '@/components/game-text';
import { useLanguage } from '@/i18n/LanguageProvider';

type Props = {
  enabled: boolean;
  allowHardDrop: boolean;
  onLeft: () => void;
  onDown: () => void;
  onRight: () => void;
  onRotate: () => void;
  onDrop: () => void;
};

type ButtonProps = {
  symbol: string;
  label: string;
  hint?: string;
  enabled: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

function ControlButton({ symbol, label, hint, enabled, onPress, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed, !enabled && styles.disabled]}>
      <Text style={styles.symbol}>{symbol}</Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export function GameControls({ enabled, allowHardDrop, onLeft, onDown, onRight, onRotate, onDrop }: Props) {
  const { t } = useLanguage();
  return (
    <View testID="game-controls" style={styles.controls}>
      <View testID="movement-controls" style={styles.movement}>
        <ControlButton symbol="◀" label={t('left')} enabled={enabled} onPress={onLeft} />
        <ControlButton symbol="▼" label={t('down')} hint={t('moveDownHint')} enabled={enabled} onPress={onDown} />
        <ControlButton symbol="▶" label={t('right')} enabled={enabled} onPress={onRight} />
      </View>
      <View testID="action-controls" style={styles.actions}>
        <ControlButton symbol="↻" label={t('rotate')} enabled={enabled} onPress={onRotate} style={styles.rotate} />
        {allowHardDrop && (
          <ControlButton symbol="⇓" label={t('drop')} hint={t('instantDropHint')} enabled={enabled} onPress={onDrop} style={styles.drop} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', gap: 16, paddingHorizontal: 8, paddingTop: 4 },
  movement: { flex: 3, flexDirection: 'row', gap: 4 },
  actions: { flex: 2, flexDirection: 'row', gap: 6 },
  button: { flex: 1, minWidth: 48, minHeight: 56, paddingHorizontal: 2, paddingVertical: 4, gap: 2, borderRadius: 12, borderWidth: 2, borderColor: '#F5A623', backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  rotate: { backgroundColor: '#2E2350', borderColor: '#A78BFA' },
  drop: { backgroundColor: '#102E40', borderColor: '#38BDF8' },
  symbol: { color: '#FFFBEB', fontSize: 22, lineHeight: 24, fontWeight: '800' },
  label: { color: '#F8FAFC', fontSize: 10, lineHeight: 12, fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.65, transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.45 },
});
