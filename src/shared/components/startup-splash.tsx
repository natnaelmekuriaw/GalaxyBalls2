import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const fadeOut = new Keyframe({
  0: { opacity: 1 },
  100: { opacity: 0 },
}).duration(400);

export function StartupSplash() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);
  const hiding = useRef(false);

  if (!visible) return null;

  const image = (
    <Image
      source={require('@/assets/branding/galaxy-balls-adaptive.png')}
      style={styles.image}
      contentFit="contain"
      accessible={false}
      onLoadEnd={() => {
        if (hiding.current) return;
        hiding.current = true;
        // Keep the native splash visible until its matching overlay has loaded.
        SplashScreen.hideAsync().catch(() => {}).finally(() => setAnimate(true));
      }}
    />
  );

  return animate ? (
    <Animated.View
      entering={fadeOut.withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      style={styles.overlay}>
      {image}
    </Animated.View>
  ) : (
    <View style={styles.overlay}>{image}</View>
  );
}

const styles = StyleSheet.create({
  image: { width: 280, height: 280 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#020518',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
