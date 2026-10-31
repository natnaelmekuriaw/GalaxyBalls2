import { useLayoutEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import {
  clampControlOffset, getControlHeightBudget, getControlMetrics, getControlOffset, normalizeControlPosition,
  type ControlBounds, type ControlMetrics, type ControlPosition,
} from '../controls/layout';
import type { SnakeControlSettings } from '../controls/settings';
import type { Direction } from '../engine/snakeEngine';
import { useControlGestureAvailability } from '../hooks/useControlGestureAvailability';
import { C } from '../theme';
import { SnakeControls } from './SnakeControls';

function createDragController(editing: boolean, bounds: ControlBounds, metrics: ControlMetrics, position: ControlPosition,
  offset: Animated.ValueXY, onPositionChange: (position: ControlPosition) => void) {
  let active = false, dragging = false;
  const origin = getControlOffset(position, bounds, metrics);
  const move = (dx: number, dy: number) => {
    const next = clampControlOffset({ x: origin.x + dx, y: origin.y + dy }, bounds, metrics);
    offset.setValue(next);
    return next;
  };
  const reset = () => { dragging = false; offset.stopAnimation(); offset.setValue(origin); };
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => active && editing,
    onMoveShouldSetPanResponder: () => active && editing,
    onPanResponderGrant: () => { if (active && editing) { dragging = true; offset.stopAnimation(); } },
    onPanResponderMove: (_, gesture) => { if (active && editing && dragging) move(gesture.dx, gesture.dy); },
    onPanResponderRelease: (_, gesture) => {
      if (!active || !editing || !dragging) return;
      dragging = false;
      onPositionChange(normalizeControlPosition(move(gesture.dx, gesture.dy), bounds, metrics, position));
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => { if (active && dragging) reset(); },
  });
  return { responder, reset, setActive(value: boolean) {
    const previous = active;
    active = value;
    if (!active || !previous) reset();
  } };
}

export function FloatingSnakeControls({ settings, bounds, compact, landscape = false, editing, enabled, onDirection, label,
  onPositionChange, onLock, moveLabel, lockLabel }: {
  settings: SnakeControlSettings; bounds: ControlBounds; compact: boolean; landscape?: boolean; editing: boolean; enabled: boolean;
  onDirection: (direction: Direction) => void; label: (direction: Direction) => string;
  onPositionChange: (position: ControlPosition) => void; onLock: () => void; moveLabel: string; lockLabel: string;
}) {
  const metrics = getControlMetrics(settings, compact, getControlHeightBudget(bounds, compact, landscape));
  const [offset] = useState(() => new Animated.ValueXY(getControlOffset(settings.position, bounds, metrics)));
  const { width, height, padHeight } = metrics;
  const { width: boundsWidth, height: boundsHeight } = bounds;
  const { x, y } = settings.position;
  const controller = useMemo(() => createDragController(editing, { width: boundsWidth, height: boundsHeight },
    { width, height, padHeight, buttonSize: 0 }, { x, y }, offset, onPositionChange),
  [editing, boundsWidth, boundsHeight, width, height, padHeight, x, y, offset, onPositionChange]);
  useLayoutEffect(() => { controller.reset(); }, [controller]);
  useControlGestureAvailability(controller);
  const nudge = (dx: number, dy: number) => {
    if (!editing) return;
    onPositionChange({ x: Math.max(0, Math.min(1, x + dx)), y: Math.max(0, Math.min(1, y + dy)) });
  };

  return <Animated.View testID="snake-control-widget" pointerEvents="box-none"
    style={[s.widget, { width, height, transform: offset.getTranslateTransform() }]}>
    {editing && <View style={s.toolbar}>
      <View {...controller.responder.panHandlers} testID="snake-control-drag-handle" accessibilityRole="adjustable" accessibilityLabel={moveLabel}
        accessibilityActions={[{ name: 'increment', label: label('RIGHT') }, { name: 'decrement', label: label('LEFT') },
          { name: 'moveUp', label: label('UP') }, { name: 'moveDown', label: label('DOWN') }]}
        onAccessibilityAction={event => {
          if (event.nativeEvent.actionName === 'increment') nudge(0.1, 0);
          else if (event.nativeEvent.actionName === 'decrement') nudge(-0.1, 0);
          else if (event.nativeEvent.actionName === 'moveUp') nudge(0, -0.1);
          else if (event.nativeEvent.actionName === 'moveDown') nudge(0, 0.1);
        }} style={[s.dragHandle, Platform.OS === 'web' && { touchAction: 'none', userSelect: 'none' }]}>
        <Text selectable={false} numberOfLines={1} style={s.handleText}>✥ {moveLabel}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={lockLabel} onPress={onLock} style={s.lockButton}>
        <Text style={s.lockGlyph}>✓</Text>
      </Pressable>
    </View>}
    <View pointerEvents={editing ? 'none' : 'auto'} style={[s.pad, { top: 44, width, height: padHeight }]}>
      <SnakeControls enabled={enabled && !editing} onDirection={onDirection} label={label} compact={compact}
        style={settings.style} size={settings.size} preview={editing} analogDiameter={metrics.width} />
    </View>
    {editing && <View pointerEvents="none" style={[s.editOutline, { top: 42, height: padHeight + 4 }]} />}
  </Animated.View>;
}

const s = StyleSheet.create({
  widget: { position: 'absolute', top: 0, left: 0 },
  toolbar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dragHandle: { flex: 1, height: 44, minWidth: 44, backgroundColor: C.panelRaised, borderRadius: 13, borderWidth: 1, borderColor: C.teal, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  handleText: { color: C.cream, fontSize: 11, fontWeight: '800' },
  lockButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' },
  lockGlyph: { color: C.bg, fontSize: 22, fontWeight: '900' },
  pad: { position: 'absolute', left: 0, alignItems: 'center' },
  editOutline: { position: 'absolute', left: -2, right: -2, borderWidth: 1, borderStyle: 'dashed', borderColor: '#44D8C180', borderRadius: 24 },
});
