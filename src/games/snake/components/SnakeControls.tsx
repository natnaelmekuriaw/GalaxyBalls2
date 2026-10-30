import { Pressable, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import type { Direction } from '../engine/snakeEngine';
import { C } from '../theme';

export function SnakeControls({ enabled, onDirection, label, compact = false }: {
  enabled: boolean; onDirection: (direction: Direction) => void; label: (direction: Direction) => string; compact?: boolean;
}) {
  const button = (direction: Direction, glyph: string) => <Pressable
    accessibilityRole="button" accessibilityLabel={label(direction)} accessibilityState={{ disabled: !enabled }}
    disabled={!enabled} onPressIn={() => onDirection(direction)} android_disableSound
    style={({ pressed }) => [styles.button, !enabled && styles.disabled, pressed && styles.pressed]}>
    <View pointerEvents="none" style={styles.buttonShine} />
    <Text style={styles.arrow}>{glyph}</Text>
  </Pressable>;
  return <View style={styles.pad}>
    <View style={styles.row}>{button('UP', '▲')}</View>
    <View style={styles.row}>
      {button('LEFT', '◀')}
      {compact ? button('DOWN', '▼') : <View style={styles.center}><View style={styles.centerRing}><View style={styles.dot} /></View></View>}
      {button('RIGHT', '▶')}
    </View>
    {!compact && <View style={styles.row}>{button('DOWN', '▼')}</View>}
  </View>;
}

const styles = StyleSheet.create({
  pad: { gap: 4, alignSelf: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  button: { width: 50, height: 48, borderRadius: 16, backgroundColor: '#21483B', borderWidth: 1, borderColor: '#42654C', borderBottomWidth: 3, borderBottomColor: '#102B24', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonShine: { position: 'absolute', top: 0, left: 10, right: 10, height: 1, backgroundColor: '#C8FF7A30' },
  arrow: { color: C.mint, fontSize: 22, fontWeight: '800' },
  center: { width: 50, height: 48, alignItems: 'center', justifyContent: 'center' },
  centerRing: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: '#315346', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#709867' },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: '#3B6550', borderBottomWidth: 1, transform: [{ translateY: 2 }] },
});
