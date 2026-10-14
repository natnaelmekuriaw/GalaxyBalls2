// import * as Device from 'expo-device';
// import { Platform, StyleSheet } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';

// import { AnimatedIcon } from '@/components/animated-icon';
// import { HintRow } from '@/components/hint-row';
// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';
// import { WebBadge } from '@/components/web-badge';
// import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// function getDevMenuHint() {
//   if (Platform.OS === 'web') {
//     return <ThemedText type="small">use browser devtools</ThemedText>;
//   }
//   if (Device.isDevice) {
//     return (
//       <ThemedText type="small">
//         shake device or press <ThemedText type="code">m</ThemedText> in terminal
//       </ThemedText>
//     );
//   }
//   const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
//   return (
//     <ThemedText type="small">
//       press <ThemedText type="code">{shortcut}</ThemedText>
//     </ThemedText>
//   );
// }

// export default function HomeScreen() {
//   return (
//     <ThemedView style={styles.container}>
//       <SafeAreaView style={styles.safeArea}>
//         <ThemedView style={styles.heroSection}>
//           <AnimatedIcon />
//           <ThemedText type="title" style={styles.title}>
//             Welcome to&nbsp;Expo
//           </ThemedText>
//         </ThemedView>

//         <ThemedText type="code" style={styles.code}>
//           get started
//         </ThemedText>

//         <ThemedView type="backgroundElement" style={styles.stepContainer}>
//           <HintRow
//             title="Try editing"
//             hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
//           />
//           <HintRow title="Dev tools" hint={getDevMenuHint()} />
//           <HintRow
//             title="Fresh start"
//             hint={<ThemedText type="code">npm run reset-project</ThemedText>}
//           />
//         </ThemedView>

//         {Platform.OS === 'web' && <WebBadge />}
//       </SafeAreaView>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     flexDirection: 'row',
//   },
//   safeArea: {
//     flex: 1,
//     paddingHorizontal: Spacing.four,
//     alignItems: 'center',
//     gap: Spacing.three,
//     paddingBottom: BottomTabInset + Spacing.three,
//     maxWidth: MaxContentWidth,
//   },
//   heroSection: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     flex: 1,
//     paddingHorizontal: Spacing.four,
//     gap: Spacing.four,
//   },
//   title: {
//     textAlign: 'center',
//   },
//   code: {
//     textTransform: 'uppercase',
//   },
//   stepContainer: {
//     gap: Spacing.three,
//     alignSelf: 'stretch',
//     paddingHorizontal: Spacing.three,
//     paddingVertical: Spacing.four,
//     borderRadius: Spacing.four,
//   },
// });

import { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");
const BALL_SIZE = 75;

export default function GalaxyBallsGame() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ballPos, setBallPos] = useState({
    top: height / 3,
    left: width / 2 - BALL_SIZE / 2,
  });

  // Countdown timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      if (score > highScore) {
        setHighScore(score);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft]);

  const moveBall = () => {
    const maxTop = height - 280;
    const maxLeft = width - BALL_SIZE - 40;
    const newTop = Math.floor(Math.random() * (maxTop - 120 + 1)) + 120;
    const newLeft = Math.floor(Math.random() * (maxLeft - 20 + 1)) + 20;
    setBallPos({ top: newTop, left: newLeft });
  };

  const handleBallTap = () => {
    if (!isPlaying) return;
    setScore(score + 1);
    moveBall();
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(15);
    setIsPlaying(true);
    moveBall();
  };

  return (
    <View style={styles.container}>
      {/* Top HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudText}>Score: {score}</Text>
        <Text style={styles.timerText}>{timeLeft}s</Text>
        <Text style={styles.hudText}>Best: {highScore}</Text>
      </View>

      {/* Main Play Area */}
      {isPlaying ? (
        <TouchableOpacity
          style={[styles.ball, { top: ballPos.top, left: ballPos.left }]}
          activeOpacity={0.7}
          onPress={handleBallTap}
        >
          <View style={styles.ballCore} />
        </TouchableOpacity>
      ) : (
        <View style={styles.menuCard}>
          <Text style={styles.title}>🌌 GalaxyBalls 2</Text>
          {timeLeft === 0 && (
            <Text style={styles.gameOver}>Time's Up! Final Score: {score}</Text>
          )}
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>
              {timeLeft === 0 ? "PLAY AGAIN" : "START GAME"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070913",
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#111625",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2833",
  },
  hudText: {
    color: "#66FCF1",
    fontSize: 18,
    fontWeight: "bold",
  },
  timerText: {
    color: "#FF4C68",
    fontSize: 20,
    fontWeight: "bold",
  },
  ball: {
    position: "absolute",
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: "rgba(102, 252, 241, 0.25)",
    borderWidth: 3,
    borderColor: "#66FCF1",
    alignItems: "center",
    justifyContent: "center",
  },
  ballCore: {
    width: BALL_SIZE * 0.45,
    height: BALL_SIZE * 0.45,
    borderRadius: BALL_SIZE,
    backgroundColor: "#FFFFFF",
  },
  menuCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  gameOver: {
    fontSize: 22,
    color: "#FFD166",
    marginBottom: 28,
    fontWeight: "600",
  },
  startButton: {
    backgroundColor: "#66FCF1",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  startButtonText: {
    color: "#070913",
    fontSize: 18,
    fontWeight: "bold",
  },
});
