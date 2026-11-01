import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import { getAnalogDirection } from '../controls/input';
import { getControlMetrics } from '../controls/layout';
import type { SnakeControlSettings } from '../controls/settings';
import type { Direction } from '../engine/snakeEngine';
import { useControlGestureAvailability } from '../hooks/useControlGestureAvailability';
import { C } from '../theme';

const GLYPHS: Record<Direction, string> = { UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' };

function virtualActivation(event: GestureResponderEvent) {
  const native = event.nativeEvent as unknown as { type?: string; detail?: number; pageX?: number; identifier?: number };
  return native.type?.startsWith('key') || (native.type === 'click' && native.detail === 0)
    || (native.type === undefined && native.pageX === undefined && native.identifier === undefined);
}

function createAnalogController(enabled: boolean, diameter: number, thumb: Animated.ValueXY,
  onDirection: (direction: Direction) => void, onHeading: (direction: Direction | null) => void) {
  let active = false, touching = false;
  let start = { x: 0, y: 0 };
  let heading: Direction | null = null;
  const travel = diameter * 0.25;
  const reset = () => {
    touching = false; heading = null; onHeading(null);
    thumb.stopAnimation(); thumb.setValue({ x: 0, y: 0 });
  };
  const sample = (x: number, y: number) => {
    if (!active || !enabled || !touching || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const distance = Math.hypot(x, y);
    const scale = distance > travel ? travel / distance : 1;
    thumb.setValue({ x: x * scale, y: y * scale });
    const next = getAnalogDirection(x, y, heading, diameter * 0.075);
    if (next !== heading) {
      heading = next; onHeading(next);
      if (next) onDirection(next);
    }
  };
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => active && enabled,
    onMoveShouldSetPanResponder: () => active && enabled,
    onPanResponderGrant: event => {
      if (!active || !enabled) return;
      touching = true; thumb.stopAnimation();
      start = { x: event.nativeEvent.locationX - diameter / 2, y: event.nativeEvent.locationY - diameter / 2 };
      sample(start.x, start.y);
    },
    onPanResponderMove: (_, gesture) => sample(start.x + gesture.dx, start.y + gesture.dy),
    onPanResponderRelease: () => { if (active && touching) reset(); },
    onPanResponderTerminate: () => { if (active && touching) reset(); },
    onPanResponderTerminationRequest: () => true,
  });
  return { responder, setActive(value: boolean) { active = value; if (!active) reset(); } };
}

function AnalogPad({ enabled, diameter, onDirection, label, preview }: {
  enabled: boolean; diameter: number; onDirection: (direction: Direction) => void; label: (direction: Direction) => string; preview: boolean;
}) {
  const [thumb] = useState(() => new Animated.ValueXY());
  const [heading, setHeading] = useState<Direction | null>(null);
  const controller = useMemo(() => createAnalogController(enabled, diameter, thumb, onDirection, setHeading), [enabled, diameter, thumb, onDirection]);
  useControlGestureAvailability(controller);
  const thumbSize = diameter * 0.38;
  return <View {...controller.responder.panHandlers} testID="snake-analog" style={[s.analog, {
    width: diameter, height: diameter, borderRadius: diameter / 2,
  }, !enabled && !preview && s.disabled, Platform.OS === 'web' && { touchAction: 'none', userSelect: 'none' }]}>
    <View pointerEvents="none" style={[s.analogTrack, { width: diameter * 0.68, height: diameter * 0.68, borderRadius: diameter / 2 }]} />
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {(['UP', 'LEFT', 'RIGHT', 'DOWN'] as Direction[]).map(direction => <Pressable key={direction}
        accessibilityRole="button" accessibilityLabel={label(direction)} disabled={!enabled}
        onPress={() => onDirection(direction)} style={[s.analogArrow, {
          left: direction === 'LEFT' ? 1 : direction === 'RIGHT' ? diameter - 45 : diameter / 2 - 22,
          top: direction === 'UP' ? 1 : direction === 'DOWN' ? diameter - 45 : diameter / 2 - 22,
        }]}><Text selectable={false} style={[s.analogGlyph, heading === direction && { color: C.mint }]}>{GLYPHS[direction]}</Text></Pressable>)}
    </View>
    <Animated.View pointerEvents="none" style={[s.thumb, {
      width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2,
      transform: thumb.getTranslateTransform(),
    }]}><View style={s.thumbRing}><View style={s.thumbDot} /></View></Animated.View>
  </View>;
}

function DirectionButton({ direction, enabled, size, preview, onDirection, label }: {
  direction: Direction; enabled: boolean; size: number; preview: boolean;
  onDirection: (direction: Direction) => void; label: string;
}) {
  const contactHandled = useRef(false);
  const physicalStart = useCallback(() => {
    if (!enabled || contactHandled.current) return;
    contactHandled.current = true;
    onDirection(direction);
  }, [enabled, onDirection, direction]);
  const endContact = useCallback(() => { contactHandled.current = false; }, []);
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: !enabled }} accessibilityActions={[{ name: 'activate' }]}
    onAccessibilityAction={event => { if (enabled && event.nativeEvent.actionName === 'activate') onDirection(direction); }}
    disabled={!enabled} unstable_pressDelay={0} hitSlop={3} pressRetentionOffset={8} android_disableSound
    onTouchStart={physicalStart} onTouchEnd={endContact} onTouchCancel={endContact}
    onPressIn={event => { if (!virtualActivation(event)) physicalStart(); }} onPressOut={endContact}
    onPress={event => { if (enabled && virtualActivation(event)) onDirection(direction); }}
    style={({ pressed }) => [s.button, { width: size, height: size }, !enabled && !preview && s.disabled, pressed && s.pressed]}>
    <View pointerEvents="none" style={s.shine} /><Text selectable={false} style={[s.arrow, { fontSize: size * 0.37 }]}>{GLYPHS[direction]}</Text>
  </Pressable>;
}

export function SnakeControls({ enabled, onDirection, label, compact = false, style = 'BUTTONS', size = 'SMALL', preview = false, analogDiameter }: {
  enabled: boolean; onDirection: (direction: Direction) => void; label: (direction: Direction) => string;
  compact?: boolean; style?: SnakeControlSettings['style']; size?: SnakeControlSettings['size']; preview?: boolean; analogDiameter?: number;
}) {
  const metrics = getControlMetrics({ style, size }, compact);
  if (style === 'ANALOG') {
    const diameter = typeof analogDiameter === 'number' && Number.isFinite(analogDiameter)
      ? Math.max(128, Math.min(metrics.width, analogDiameter)) : metrics.width;
    return <AnalogPad enabled={enabled} diameter={diameter} onDirection={onDirection} label={label} preview={preview} />;
  }
  const button = (direction: Direction) => <DirectionButton direction={direction} enabled={enabled} size={metrics.buttonSize}
    preview={preview} onDirection={onDirection} label={label(direction)} />;
  return <View testID="snake-buttons" style={s.pad}>
    <View style={s.row}>{button('UP')}</View>
    <View style={s.row}>{button('LEFT')}{compact ? button('DOWN') : <View style={[s.center, { width: metrics.buttonSize, height: metrics.buttonSize }]}><View style={s.centerRing}><View style={s.thumbDot} /></View></View>}{button('RIGHT')}</View>
    {!compact && <View style={s.row}>{button('DOWN')}</View>}
  </View>;
}

const s = StyleSheet.create({
  pad: { gap: 8, alignSelf: 'flex-end' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  button: { borderRadius: 22, backgroundColor: '#21483B', borderWidth: 1.5, borderColor: '#4C7352', borderBottomWidth: 4, borderBottomColor: '#102B24', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', top: 1, left: 14, right: 14, height: 1, backgroundColor: '#C8FF7A3D' },
  arrow: { color: C.mint, fontWeight: '900' },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerRing: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#3C6350', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { backgroundColor: '#4A7354', borderColor: C.mint },
  analog: { backgroundColor: '#15382F', borderWidth: 2, borderColor: '#4B7053', alignItems: 'center', justifyContent: 'center' },
  analogTrack: { position: 'absolute', backgroundColor: '#0C2724', borderWidth: 1, borderColor: '#305347' },
  analogArrow: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  analogGlyph: { color: '#89A78B', fontSize: 18, fontWeight: '800' },
  thumb: { backgroundColor: '#3D6647', borderWidth: 2, borderColor: C.mint, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center' },
  thumbRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#9CC77666', alignItems: 'center', justifyContent: 'center' },
  thumbDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.mint },
});
