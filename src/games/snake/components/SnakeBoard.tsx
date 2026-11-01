import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';

import { getSwipeDirection } from '../controls/input';
import { getSnakeLevel, SNAKE_BONUS_TICKS, SNAKE_COLS, SNAKE_ROWS, type Direction, type Point, type SnakeState } from '../engine/snakeEngine';
import { getSnakePalette, type SnakePalette } from '../presentation/palette';
import { C } from '../theme';

const HEAD_ROTATION: Record<Direction, string> = { RIGHT: '0deg', DOWN: '90deg', LEFT: '180deg', UP: '-90deg' };
const SPARK_ANGLES = Array.from({ length: 8 }, (_, index) => index * Math.PI / 4);

const Grid = memo(function Grid({ cell }: { cell: number }) {
  return <>
    {Array.from({ length: SNAKE_ROWS / 2 }, (_, i) => (
      <View key={`shade${i}`} style={[styles.fieldStripe, { top: (i * 2 + 1) * cell, height: cell }]} />
    ))}
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

/** The same connected trail gives the menu and the live board one visual identity. */
export const SnakeTrail = memo(function SnakeTrail({ body, direction, cell, testHead = false, palette = getSnakePalette(1) }: {
  body: Point[]; direction: Direction; cell: number; testHead?: boolean; palette?: SnakePalette;
}) {
  return <>
    {body.slice(1).map((point, index) => {
      const previous = body[index];
      const horizontal = point.x !== previous.x;
      const color = palette.body[Math.min(Math.floor(index / 3), palette.body.length - 1)];
      return <View key={`join${index}`} style={[styles.trailJoin, {
        left: Math.min(point.x, previous.x) * cell + cell * 0.18,
        top: Math.min(point.y, previous.y) * cell + cell * 0.18,
        width: cell * (horizontal ? 1.64 : 0.64), height: cell * (horizontal ? 0.64 : 1.64),
        backgroundColor: color, borderRadius: cell * 0.24,
      }]} />;
    })}
    {body.map((point, index) => {
      const head = index === 0;
      const tail = index === body.length - 1;
      const inset = head ? 0.015 : tail ? 0.2 : 0.08;
      const color = head ? palette.head : palette.body[Math.min(Math.floor((index - 1) / 3), palette.body.length - 1)];
      return <View key={index} testID={head && testHead ? 'snake-head' : undefined} style={[styles.segment, {
        left: point.x * cell + cell * inset, top: point.y * cell + cell * inset,
        width: cell * (1 - inset * 2), height: cell * (1 - inset * 2),
        borderRadius: cell * (head ? 0.37 : tail ? 0.45 : 0.32),
        backgroundColor: color, zIndex: head ? 3 : 2,
        transform: head ? [{ rotate: HEAD_ROTATION[direction] }] : undefined,
      }]}>
        {head ? <>
          <View style={[styles.tongue, { right: -cell * 0.13, top: cell * 0.46, width: cell * 0.21, height: Math.max(1, cell * 0.06), borderRadius: cell * 0.04 }]} />
          <View style={[styles.snout, { backgroundColor: palette.head, right: -cell * 0.01, top: cell * 0.28, width: cell * 0.13, height: cell * 0.42, borderRadius: cell * 0.13 }]} />
          {[0.12, 0.59].map(top => <View key={top} style={[styles.eye, {
            left: cell * 0.54, top: cell * top, width: cell * 0.32, height: cell * 0.31, borderRadius: cell * 0.17,
          }]}><View style={[styles.pupil, { width: cell * 0.13, height: cell * 0.16, borderRadius: cell * 0.08, right: cell * 0.035, top: cell * 0.07 }]} /></View>)}
          <View style={[styles.blush, { left: cell * 0.28, top: cell * 0.14, width: cell * 0.12, height: cell * 0.12, borderRadius: cell * 0.08 }]} />
          <View style={[styles.blush, { left: cell * 0.28, top: cell * 0.72, width: cell * 0.12, height: cell * 0.12, borderRadius: cell * 0.08 }]} />
        </> : index % 3 === 1 && !tail ? <View style={[styles.scaleMark, { width: cell * 0.18, height: cell * 0.1, borderRadius: cell * 0.05, top: cell * 0.16, left: cell * 0.21 }]} /> : null}
      </View>;
    })}
  </>;
});

export function GardenFruit({ cell, golden = false }: { cell: number; golden?: boolean }) {
  return <View pointerEvents="none" style={{ width: cell, height: cell }}>
    <View style={[styles.fruitGlow, { backgroundColor: golden ? '#FFD36E15' : '#FF977612', borderColor: golden ? '#FFD36E44' : '#FF977630', width: cell * 1.15, height: cell * 1.15, borderRadius: cell, left: -cell * 0.075, top: -cell * 0.075 }]} />
    <View style={[styles.fruitShadow, { width: cell * 0.63, height: cell * 0.16, left: cell * 0.19, top: cell * 0.76, borderRadius: cell * 0.2 }]} />
    <View style={[styles.apple, { backgroundColor: golden ? C.gold : C.coral, borderColor: golden ? '#FFF0AC' : '#FFC1A8', width: cell * 0.7, height: cell * 0.64, left: cell * 0.15, top: cell * 0.24, borderRadius: cell * 0.29 }]} />
    <View style={[styles.fruitShine, { width: cell * 0.14, height: cell * 0.21, left: cell * 0.28, top: cell * 0.34, borderRadius: cell * 0.12 }]} />
    <View style={[styles.stem, { height: cell * 0.2, width: Math.max(1, cell * 0.08), left: cell * 0.46, top: cell * 0.08 }]} />
    <View style={[styles.leaf, { width: cell * 0.26, height: cell * 0.14, left: cell * 0.53, top: cell * 0.07, borderTopLeftRadius: cell * 0.18, borderBottomRightRadius: cell * 0.18 }]} />
  </View>;
}

export function GardenRock({ cell }: { cell: number }) {
  return <View pointerEvents="none" style={{ width: cell, height: cell }}>
    <View style={[styles.rockShadow, { width: cell * 0.88, height: cell * 0.25, left: cell * 0.06, bottom: cell * 0.04, borderRadius: cell * 0.2 }]} />
    <View style={[styles.rock, { width: cell * 0.87, height: cell * 0.76, left: cell * 0.065, top: cell * 0.1, borderRadius: cell * 0.25, borderTopLeftRadius: cell * 0.39 }]}>
      <View style={[styles.rockFacet, { left: cell * 0.12, top: cell * 0.11, width: cell * 0.35, height: cell * 0.12, borderRadius: cell * 0.08 }]} />
      <View style={[styles.rockMoss, { right: cell * 0.03, bottom: 0, width: cell * 0.32, height: cell * 0.14, borderRadius: cell * 0.06 }]} />
    </View>
  </View>;
}

export type SnakeBoardFeedback = { id: number; kind: 'food' | 'bonus' | 'level'; points: number; position?: Point };

const PickupBurst = memo(function PickupBurst({ feedback, point, cell, accent, enabled, reducedMotion }: {
  feedback: SnakeBoardFeedback; point: Point; cell: number; accent: string; enabled: boolean; reducedMotion: boolean;
}) {
  const [progress] = useState(() => new Animated.Value(1));
  const [origin] = useState(() => ({ ...(feedback.position ?? point) }));
  const consumed = useRef(false);
  const level = feedback.kind === 'level';
  const color = feedback.kind === 'bonus' ? C.gold : accent;
  useEffect(() => {
    progress.stopAnimation();
    if (!enabled || reducedMotion || consumed.current) {
      consumed.current = true;
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: level ? 800 : 380,
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, enabled, reducedMotion, level]);
  if (reducedMotion) return null;

  const centerX = (origin.x + 0.5) * cell;
  const centerY = (origin.y + 0.5) * cell;
  const opacity = progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.9, 0.75, 0] });
  const sparkSize = Math.max(3, cell * 0.2);
  return <View pointerEvents="none" accessible={false} style={styles.rewardLayer}>
    <Animated.View testID={level ? 'snake-level-burst' : 'snake-pickup-burst'} style={[styles.bloom, {
      left: centerX - cell, top: centerY - cell, width: cell * 2, height: cell * 2,
      borderRadius: cell, borderColor: color, opacity,
      transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, level ? 2.4 : 1.6] }) }],
    }]} />
    {level && <>
      <Animated.View style={[styles.levelEdge, { borderColor: accent,
        opacity: progress.interpolate({ inputRange: [0, 0.14, 0.45, 1], outputRange: [0, 0.65, 0.35, 0] }),
      }]} />
      {SPARK_ANGLES.map((angle, index) => <Animated.View key={index} style={[styles.spark, {
        left: centerX - sparkSize / 2, top: centerY - sparkSize / 2,
        width: sparkSize, height: sparkSize, backgroundColor: index % 2 ? C.cream : accent, opacity,
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [Math.cos(angle) * cell * 0.35, Math.cos(angle) * cell * 2.8] }) },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [Math.sin(angle) * cell * 0.35, Math.sin(angle) * cell * 2.8] }) },
          { rotate: '45deg' },
          { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.3] }) },
        ],
      }]} />)}
    </>}
  </View>;
});

export function SnakeBoard({ state, size, label, onDirection, enabled, children, reducedMotion = false, feedback, levelFeedback }: {
  state: SnakeState; size: number; label: string; onDirection: (direction: Direction) => void;
  enabled: boolean; children?: ReactNode; reducedMotion?: boolean; feedback?: SnakeBoardFeedback; levelFeedback?: SnakeBoardFeedback;
}) {
  const cell = size / SNAKE_COLS;
  const responder = useMemo(() => createSwipeResponder(enabled, onDirection), [enabled, onDirection]);
  const palette = getSnakePalette(getSnakeLevel(state));
  const milestone = levelFeedback ?? (feedback?.kind === 'level' ? feedback : undefined);
  const bonus = state.bonus;

  return <View style={[styles.frame, { width: size + 8, height: size + 8 }]}>
    <View {...responder.panHandlers} testID="snake-board" accessibilityLabel={label} accessibilityRole="image" accessible
      style={[styles.board, { width: size, height: size }, Platform.OS === 'web' && { touchAction: 'none' }]}>
      <Grid cell={cell} />
      {state.rocks.map(point => <View key={`rock${point.x},${point.y}`} style={[styles.artCell, { left: point.x * cell, top: point.y * cell }]}><GardenRock cell={cell} /></View>)}
      {state.food && <View testID="snake-food" style={[styles.artCell, { left: state.food.x * cell, top: state.food.y * cell, width: cell, height: cell }]}><GardenFruit cell={cell} /></View>}
      {bonus && <View testID="snake-bonus" style={[styles.artCell, { left: bonus.position.x * cell, top: bonus.position.y * cell, width: cell, height: cell }]}>
        <GardenFruit cell={cell} golden />
        <View style={[styles.bonusTrack, { top: cell * 0.96, width: cell * 0.9, left: cell * 0.05 }]}><View style={[styles.bonusLife, { width: `${bonus.ticksLeft / SNAKE_BONUS_TICKS * 100}%` }]} /></View>
      </View>}
      <SnakeTrail body={state.body} direction={state.direction} cell={cell} palette={palette} testHead />
      {feedback && feedback.kind !== 'level' && <PickupBurst key={`pickup-${feedback.id}`} feedback={feedback}
        point={feedback.position ?? state.body[0]} cell={cell} accent={palette.accent} enabled={enabled} reducedMotion={reducedMotion} />}
      {milestone && <PickupBurst key={`level-${milestone.id}`} feedback={milestone}
        point={milestone.position ?? state.body[0]} cell={cell} accent={palette.accent} enabled={enabled} reducedMotion={reducedMotion} />}
      <View pointerEvents="none" style={styles.fieldShine} />
    </View>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  frame: { borderRadius: 23, borderWidth: 4, borderColor: '#31574C', backgroundColor: '#0A2525', overflow: 'hidden' },
  board: { backgroundColor: '#0A2525', overflow: 'hidden', borderRadius: 18 },
  fieldStripe: { position: 'absolute', left: 0, right: 0, backgroundColor: '#D0E6BC03', pointerEvents: 'none' },
  gridLine: { position: 'absolute', backgroundColor: '#BDD5B409', pointerEvents: 'none' },
  fieldShine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: '#9BB6A822' },
  trailJoin: { position: 'absolute', pointerEvents: 'none' },
  segment: { position: 'absolute', borderTopWidth: 1, borderColor: '#F7F0D944', pointerEvents: 'none' },
  scaleMark: { position: 'absolute', backgroundColor: '#E8FFB54D' },
  snout: { position: 'absolute', backgroundColor: C.mint },
  tongue: { position: 'absolute', backgroundColor: C.coral },
  eye: { position: 'absolute', backgroundColor: C.cream },
  pupil: { position: 'absolute', backgroundColor: '#173A35' },
  blush: { position: 'absolute', backgroundColor: '#FF97769C' },
  artCell: { position: 'absolute', pointerEvents: 'none' },
  fruitGlow: { position: 'absolute', borderWidth: 1 },
  fruitShadow: { position: 'absolute', backgroundColor: '#00000036' },
  apple: { position: 'absolute', borderTopWidth: 1 },
  fruitShine: { position: 'absolute', backgroundColor: '#FFF8E05C', transform: [{ rotate: '25deg' }] },
  stem: { position: 'absolute', backgroundColor: '#B8C882', borderRadius: 2, transform: [{ rotate: '12deg' }] },
  leaf: { position: 'absolute', backgroundColor: C.teal, transform: [{ rotate: '-18deg' }] },
  bonusTrack: { position: 'absolute', height: 2, backgroundColor: '#FFD36E26', borderRadius: 2, overflow: 'hidden' },
  bonusLife: { height: '100%', backgroundColor: C.gold },
  rock: { position: 'absolute', backgroundColor: '#637B72', borderBottomWidth: 2, borderBottomColor: '#344C45', borderTopWidth: 1, borderTopColor: '#9DB1A2' },
  rockShadow: { position: 'absolute', backgroundColor: '#00000036' },
  rockFacet: { position: 'absolute', backgroundColor: '#B8C8B24D', transform: [{ rotate: '-15deg' }] },
  rockMoss: { position: 'absolute', backgroundColor: '#7A9D54' },
  bloom: { position: 'absolute', borderWidth: 2, zIndex: 4 },
  rewardLayer: { ...StyleSheet.absoluteFill, zIndex: 4, pointerEvents: 'none' },
  levelEdge: { ...StyleSheet.absoluteFill, borderWidth: 2, borderRadius: 18 },
  spark: { position: 'absolute', borderRadius: 1 },
});
