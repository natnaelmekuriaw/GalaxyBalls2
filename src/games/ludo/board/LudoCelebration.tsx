import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { GameText as Text } from '@/shared/components/game-text';
import type { LudoEvent } from '../engine/ludoEngine';

export function LudoCelebration({ event, revision, color }: { event: LudoEvent; revision: number; color: string }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (event !== 'capture' && event !== 'home' && event !== 'win') return;
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(event === 'win' ? 1400 : 350),
      Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [event, revision, progress]);
  return <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Animated.View style={[styles.burst, { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
      {Array.from({ length: 12 }, (_, index) => <Text key={index} style={[styles.star, { color,
        left: `${10 + index % 4 * 24}%`, top: `${15 + Math.floor(index / 4) * 28}%`, fontSize: index % 3 === 0 ? 34 : 22 }]}>{event === 'capture' ? '✦' : '★'}</Text>)}
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  burst: { ...StyleSheet.absoluteFill }, star: { position: 'absolute', textShadowColor: '#FFFFFF', textShadowRadius: 6 },
});
