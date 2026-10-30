import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Point } from '../engine/snakeEngine';
import { C } from '../theme';
import { GardenFruit, GardenRock, SnakeTrail } from './SnakeBoard';

const TRAIL: Point[] = [
  { x: 8, y: 1 }, { x: 7, y: 1 }, { x: 6, y: 1 }, { x: 5, y: 1 },
  { x: 4, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
  { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 4, y: 4 },
  { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 },
];

function Sprig({ left, top, flip = false }: { left: number; top: number; flip?: boolean }) {
  return <View style={[styles.sprig, { left, top, transform: [{ scaleX: flip ? -1 : 1 }, { rotate: '-12deg' }] }]}>
    <View style={styles.sprigStem} />
    {[0, 1, 2].map(index => <View key={index} style={[styles.sprigLeaf, { top: index * 9, left: index % 2 ? 8 : -3, transform: [{ rotate: index % 2 ? '-35deg' : '35deg' }] }]} />)}
  </View>;
}

export const SnakeHero = memo(function SnakeHero({ compact = false }: { compact?: boolean; reducedMotion?: boolean }) {
  return <View accessible={false} pointerEvents="none" style={[styles.hero, compact && styles.compact]}>
    <View style={[styles.scene, compact && styles.compactScene]}>
      <View style={styles.halo} />
      <View style={styles.floor} />
      {[0, 1, 2, 3, 4].map(index => <View key={`line${index}`} style={[styles.floorLine, { top: 38 + index * 26 }]} />)}
      <View style={styles.trail}><SnakeTrail body={TRAIL} direction="RIGHT" cell={25} /></View>
      <View style={styles.heroFruit}><GardenFruit cell={31} /></View>
      <View style={styles.smallFruit}><GardenFruit cell={19} golden /></View>
      <View style={styles.frontRock}><GardenRock cell={35} /></View>
      <View style={styles.backRock}><GardenRock cell={23} /></View>
      <Sprig left={17} top={56} />
      <Sprig left={284} top={96} flip />
      <Sprig left={35} top={122} flip />
      {[{ x: 55, y: 27 }, { x: 288, y: 39 }, { x: 245, y: 121 }, { x: 152, y: 16 }].map((point, index) => <View key={index} style={[styles.firefly, { left: point.x, top: point.y, opacity: 0.35 + index * 0.15 }]} />)}
    </View>
  </View>;
});

const styles = StyleSheet.create({
  hero: { width: '100%', height: 164, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  compact: { height: 128 },
  scene: { width: 320, height: 164 },
  compactScene: { transform: [{ scale: 0.85 }] },
  halo: { position: 'absolute', width: 250, height: 148, left: 34, top: 8, borderRadius: 100, backgroundColor: '#C8FF7A06', borderWidth: 1, borderColor: '#C8FF7A08' },
  floor: { position: 'absolute', left: 15, right: 15, top: 22, bottom: 4, borderRadius: 48, backgroundColor: '#44D8C104' },
  floorLine: { position: 'absolute', left: 28, right: 28, height: 1, backgroundColor: '#C8FF7A07' },
  trail: { position: 'absolute', left: 4, top: 7, width: 270, height: 142 },
  heroFruit: { position: 'absolute', left: 258, top: 35, transform: [{ rotate: '9deg' }] },
  smallFruit: { position: 'absolute', left: 55, top: 44 },
  frontRock: { position: 'absolute', left: 214, top: 115, transform: [{ rotate: '-7deg' }] },
  backRock: { position: 'absolute', left: 263, top: 100, opacity: 0.7 },
  sprig: { position: 'absolute', width: 24, height: 37 },
  sprigStem: { position: 'absolute', width: 2, height: 33, left: 9, top: 1, borderRadius: 2, backgroundColor: '#3E8267' },
  sprigLeaf: { position: 'absolute', width: 16, height: 8, backgroundColor: '#5DA17D', borderTopLeftRadius: 12, borderBottomRightRadius: 12 },
  firefly: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: C.gold },
});
