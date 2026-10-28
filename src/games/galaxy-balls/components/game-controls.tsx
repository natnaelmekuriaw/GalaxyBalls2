import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { HOLD_DELAY_MS } from '@/games/galaxy-balls/controls/holdController';
import { useHeldMovement } from '@/games/galaxy-balls/hooks/use-held-movement';

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
  onPressIn: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function ControlButton({ symbol, label, hint, enabled, onPress, onPressIn, onPressOut, onLongPress, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      delayLongPress={HOLD_DELAY_MS}
      onBlur={onPressOut ?? onPressIn}
      pressRetentionOffset={0}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed, !enabled && styles.disabled]}>
      <Text style={styles.symbol}>{symbol}</Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export function GameControls({ enabled, allowHardDrop, onLeft, onDown, onRight, onRotate, onDrop }: Props) {
  const { t } = useLanguage();
  const held = useHeldMovement(enabled, { left: onLeft, down: onDown, right: onRight });
  return (
    <View testID="game-controls" style={styles.controls}>
      <View testID="action-controls" style={styles.actions}>
        <ControlButton symbol="↻" label={t('rotate')} enabled={enabled} onPress={onRotate} onPressIn={() => held.stop()} style={styles.rotate} />
        {allowHardDrop && (
          <ControlButton symbol="⇓" label={t('drop')} hint={t('instantDropHint')} enabled={enabled} onPress={onDrop} onPressIn={() => held.stop()} style={styles.drop} />
        )}
      </View>
      <View testID="movement-controls" style={styles.movement}>
        <ControlButton symbol="◀" label={t('left')} hint={t('moveLeftHint')} enabled={enabled} onPress={onLeft} onPressIn={() => held.stop()} onLongPress={() => held.start('left')} onPressOut={() => held.stop('left')} />
        <ControlButton symbol="▼" label={t('down')} hint={t('moveDownHint')} enabled={enabled} onPress={onDown} onPressIn={() => held.stop()} onLongPress={() => held.start('down')} onPressOut={() => held.stop('down')} />
        <ControlButton symbol="▶" label={t('right')} hint={t('moveRightHint')} enabled={enabled} onPress={onRight} onPressIn={() => held.stop()} onLongPress={() => held.start('right')} onPressOut={() => held.stop('right')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { width: '100%', maxWidth: 520, alignSelf: 'flex-end', flexDirection: 'row', gap: 16, paddingHorizontal: 8, paddingTop: 4 },
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
