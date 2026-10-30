import { memo, useMemo, type ReactNode } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';

import { getSwipeDirection } from '../controls/input';
import { SNAKE_COLS, SNAKE_ROWS, type Direction, type SnakeState } from '../engine/snakeEngine';

const Grid = memo(function Grid({ cell }: { cell: number }) {
  return <>
    {Array.from({ length: SNAKE_COLS - 1 }, (_, i) => (
      <View key={`v${i}`} style={[styles.gridLine, { left: (i + 1) * cell, width: 1, height: '100%' }]} />
    ))}
    {Array.from({ length: SNAKE_ROWS - 1 }, (_, i) => (
      <View key={`h${i}`} style={[styles.gridLine, { top: (i + 1) * cell, height: 1, width: '100%' }]} />
    ))}
  </>;
});

function createSwipeResponder(enabled: boolean, onDirection: (direction: Direction) => void) {
  let lastSwipe = { x: 0, y: 0 };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => enabled,
    onMoveShouldSetPanResponder: (_, gesture) => enabled && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 8,
    onPanResponderGrant: () => { lastSwipe = { x: 0, y: 0 }; },
    onPanResponderMove: (_, gesture) => {
      if (!enabled) return;
      const direction = getSwipeDirection(gesture.dx - lastSwipe.x, gesture.dy - lastSwipe.y);
      if (direction) {
        onDirection(direction);
        lastSwipe = { x: gesture.dx, y: gesture.dy };
      }
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: () => { lastSwipe = { x: 0, y: 0 }; },
    onPanResponderTerminate: () => { lastSwipe = { x: 0, y: 0 }; },
  });
}

export function SnakeBoard({ state, size, label, onDirection, enabled, children }: {
  state: SnakeState;
  size: number;
  label: string;
  onDirection: (direction: Direction) => void;
  enabled: boolean;
  children?: ReactNode;
}) {
  const cell = size / SNAKE_COLS;
  const responder = useMemo(() => createSwipeResponder(enabled, onDirection), [enabled, onDirection]);
  const vertical = state.direction === 'UP' || state.direction === 'DOWN';
  const forward = state.direction === 'RIGHT' || state.direction === 'DOWN' ? 0.68 : 0.2;

  return (
    <View style={[styles.frame, { width: size + 8, height: size + 8 }]}>
      <View
        {...responder.panHandlers}
        testID="snake-board"
        accessibilityLabel={label}
        accessibilityRole="image"
        accessible
        style={[styles.board, { width: size, height: size }, Platform.OS === 'web' && { touchAction: 'none' }]}>
        <Grid cell={cell} />
        {state.food && (
          <View testID="snake-food" style={[styles.foodHalo, {
            left: state.food.x * cell, top: state.food.y * cell, width: cell, height: cell,
          }]}>
            <View style={[styles.food, { width: cell * 0.64, height: cell * 0.64, borderRadius: cell * 0.2 }]} />
          </View>
        )}
        {state.body.map((point, index) => (
          <View
            key={index}
            testID={index === 0 ? 'snake-head' : undefined}
            style={[styles.segment, {
              left: point.x * cell + 0.6, top: point.y * cell + 0.6,
              width: cell - 1.2, height: cell - 1.2,
              borderRadius: cell * (index === 0 ? 0.32 : 0.23),
              backgroundColor: index === 0 ? '#D9F99D' : index % 2 ? '#A3E635' : '#84CC16',
            }]}>
            {index === 0 && [0.22, 0.65].map((across) => (
              <View key={across} style={[styles.eye, {
                width: Math.max(2, cell * 0.14), height: Math.max(2, cell * 0.14),
                left: cell * (vertical ? across : forward), top: cell * (vertical ? forward : across),
              }]} />
            ))}
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 15, borderWidth: 4, borderColor: '#2B5131', backgroundColor: '#0B2019', overflow: 'hidden' },
  board: { backgroundColor: '#0B2019', overflow: 'hidden' },
  gridLine: { position: 'absolute', backgroundColor: '#163526', pointerEvents: 'none' },
  segment: { position: 'absolute', borderTopWidth: 1, borderColor: '#ECFCCB88', pointerEvents: 'none' },
  eye: { position: 'absolute', backgroundColor: '#163014', borderRadius: 2 },
  foodHalo: { position: 'absolute', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  food: { backgroundColor: '#F5B942', borderWidth: 1, borderColor: '#FDE68A', transform: [{ rotate: '12deg' }] },
});
