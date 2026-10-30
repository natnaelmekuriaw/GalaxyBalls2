import { Pressable, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import type { Direction } from '../engine/snakeEngine';

export function SnakeControls({ enabled, onDirection, label }: {
  enabled: boolean;
  onDirection: (direction: Direction) => void;
  label: (direction: Direction) => string;
}) {
  const button = (direction: Direction, glyph: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label(direction)}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPressIn={() => onDirection(direction)}
      style={({ pressed }) => [styles.button, !enabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={styles.arrow}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={styles.pad}>
      <View style={styles.row}>{button('UP', '▲')}</View>
      <View style={styles.row}>
        {button('LEFT', '◀')}
        <View style={styles.center}><View style={styles.dot} /></View>
        {button('RIGHT', '▶')}
      </View>
      <View style={styles.row}>{button('DOWN', '▼')}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 4, alignSelf: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  button: { width: 48, height: 48, borderRadius: 13, backgroundColor: '#193727', borderColor: '#4D7C0F', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: '#D9F99D', fontSize: 23, fontWeight: '800' },
  center: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3F6212' },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: '#3F6212', transform: [{ scale: 0.94 }] },
});
