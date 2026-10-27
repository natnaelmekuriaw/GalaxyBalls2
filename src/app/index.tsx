// src/app/(tabs)/index.tsx
import { router, useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Dimensions,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import {
  Cell,
  EngineState,
  GRID_COLS,
  GRID_ROWS,
  GameMode,
  MASCOTS,
  MascotInfo,
  MascotMood,
  LockResolutionSummary,
  canPlacePiece,
  createNewGameState,
  getFallIntervalMs,
  getGhostY,
  getPiecePreview,
  lockActivePieceAndResolve,
  movePiece,
  rotateActivePiece,
  stepGravityTick,
} from "../engine/galaxyEngine";
import { runAllEngineTests } from "../engine/galaxyEngine.test";
import { GameText as Text } from "../components/game-text";
import { useLanguage } from "../i18n/LanguageProvider";
import { LANGUAGES } from "../i18n/translations";
import { getResolutionSounds } from "../audio/soundEvents";
import { useGameSounds } from "../hooks/use-game-sounds";
import { useMenuMusic } from "../hooks/use-menu-music";
import { useGameData } from "../data/GameDataProvider";
import { NewGameConfirmation } from "../components/new-game-confirmation";
import { GameControls } from "../components/game-controls";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CELL_SIZE = Math.min(
  Math.floor((SCREEN_WIDTH * 0.63) / GRID_COLS),
  Math.floor((SCREEN_HEIGHT * 0.64) / GRID_ROWS)
);
const PREVIEW_CELL_SIZE = Math.floor(CELL_SIZE * 0.72);

const NORMAL_BLOCKS = [
  {
    name: "Blue",
    outer: "#1565C0",
    body: "#1E88E5",
    highlight: "#90CAF9",
    deep: "#0D47A1",
    emblem: "🌊",
    symbol: "◔",
  },
  {
    name: "Green",
    outer: "#1B5E20",
    body: "#2E9E28",
    highlight: "#A5D6A7",
    deep: "#144718",
    emblem: "🍀",
    symbol: "●",
  },
  {
    name: "Red",
    outer: "#8E0000",
    body: "#D32F2F",
    highlight: "#EF9A9A",
    deep: "#600000",
    emblem: "🍁",
    symbol: "✦",
  },
  {
    name: "Gold",
    outer: "#9A7D0A",
    body: "#D4AC0D",
    highlight: "#F9E79F",
    deep: "#7D6608",
    emblem: "☀️",
    symbol: "◆",
  },
  {
    name: "Purple",
    outer: "#4A148C",
    body: "#7B1FA2",
    highlight: "#CE93D8",
    deep: "#310B5E",
    emblem: "🌀",
    symbol: "✹",
  },
];

function UfoCompetitorAvatar({
  mascot,
  mood,
  jumpAnim,
}: {
  mascot: MascotInfo;
  mood: MascotMood;
  jumpAnim: Animated.Value;
}) {
  return (
    <View style={styles.ufoSceneContainer}>
      <Text style={styles.ufoStars}>✦ · ✧</Text>
      <View style={styles.bluePlanetHorizon}>
        <View style={styles.bluePlanetGlow} />
      </View>

      <Animated.View
        style={[
          styles.ufoWrapper,
          {
            transform: [{ translateY: jumpAnim }],
          },
        ]}
      >
        <View style={styles.cockpitGlass} />
        <View
          style={[styles.creatureHead, { backgroundColor: mascot.furColor }]}
        >
          <View
            style={[
              styles.creatureEar,
              styles.earLeft,
              {
                backgroundColor: mascot.furColor,
                borderColor: mascot.earColor,
              },
            ]}
          />
          <View
            style={[
              styles.creatureEar,
              styles.earRight,
              {
                backgroundColor: mascot.furColor,
                borderColor: mascot.earColor,
              },
            ]}
          />
          {mascot.stripes && (
            <View style={styles.stripeRow}>
              <View style={styles.stripeBar} />
              <View style={styles.stripeBar} />
              <View style={styles.stripeBar} />
            </View>
          )}
          <View style={styles.eyeRow}>
            {mood === "HAPPY" || mood === "COMBO" ? (
              <>
                <Text style={styles.happyEyeArch}>^</Text>
                <Text style={styles.happyEyeArch}>^</Text>
              </>
            ) : (
              <>
                <View
                  style={[styles.eyeBall, { backgroundColor: mascot.eyeColor }]}
                >
                  <View style={styles.eyePupil} />
                </View>
                <View
                  style={[styles.eyeBall, { backgroundColor: mascot.eyeColor }]}
                >
                  <View style={styles.eyePupil} />
                </View>
              </>
            )}
          </View>
          <View style={styles.cheekRow}>
            <View
              style={[
                styles.puffyCheek,
                { backgroundColor: mascot.cheeksColor },
              ]}
            />
            <View style={styles.noseMouthBox}>
              <View style={styles.cuteNose} />
              <View
                style={[
                  styles.cuteMouth,
                  mood === "DANGER" && { borderRadius: 6, height: 6, width: 6 },
                ]}
              />
            </View>
            <View
              style={[
                styles.puffyCheek,
                { backgroundColor: mascot.cheeksColor },
              ]}
            />
          </View>
        </View>
        <View style={styles.saucerCollar} />
        <View style={styles.saucerDiscOuter}>
          <View style={styles.saucerDiscInner}>
            <View style={styles.saucerLightDot} />
            <View style={styles.saucerLightDot} />
            <View style={styles.saucerLightDot} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function snapshotEngineState(state: EngineState): EngineState {
  const copyPiece = (piece: EngineState["nextPiece"]) => ({
    ...piece,
    cells: piece.cells.map((cell) => ({ ...cell })),
  });
  return {
    ...state,
    grid: state.grid.map((row) => row.map((cell) => ({ ...cell }))),
    activePiece: state.activePiece ? copyPiece(state.activePiece) : null,
    nextPiece: copyPiece(state.nextPiece),
  };
}

export default function OrbitBlocksApp() {
  const navigation = useNavigation();
  const { language, setLanguage, t } = useLanguage();
  const { soundsEnabled, setSoundsEnabled, menuMusicEnabled, setMenuMusicEnabled, highScores, currentGame, saveCurrentGame, finishGame, saveFailed } = useGameData();

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: "none" },
      headerShown: false,
    });
  }, [navigation]);

  const [screen, setScreen] = useState<
    "TITLE" | "GAME" | "HIGHSCORES" | "HOWTO" | "SETTINGS"
  >("TITLE");
  const [gameState, setGameState] = useState<EngineState>(() =>
    createNewGameState("CLASSIC")
  );

  const [animX] = useState(() => new Animated.Value(2 * CELL_SIZE));
  const [animY] = useState(() => new Animated.Value(0));
  const [mascotJumpAnim] = useState(() => new Animated.Value(0));

  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const { play: playSound, playSequence: playSoundSequence, stop: stopSounds } = useGameSounds(soundsEnabled);
  const menuMusic = useMenuMusic(soundsEnabled && menuMusicEnabled && screen !== "GAME");
  const [colorblindGlyphs, setColorblindGlyphs] = useState(true);
  const highContrast = false;
  const [rotationStrategy, setRotationStrategy] = useState<
    "GEOMETRY_90" | "COLOR_CYCLE"
  >("GEOMETRY_90");
  const experimental4Block = false;

  const [testReport, setTestReport] = useState<string[] | null>(null);
  const [pendingNewGameMode, setPendingNewGameMode] = useState<GameMode | null>(null);
  const [bannerText, setBannerText] = useState<string | null>(null);
  const stateRef = useRef<EngineState>(gameState);

  const forceRender = useCallback(() => {
    saveCurrentGame(stateRef.current);
    setGameState(snapshotEngineState(stateRef.current));
  }, [saveCurrentGame]);

  const showScreen = (target: typeof screen) => {
    setPendingNewGameMode(null);
    if (screen === "GAME" && stateRef.current.status === "PLAYING") {
      stateRef.current.status = "PAUSED";
      forceRender();
    }
    stopSounds();
    menuMusic.start();
    playSound("ui");
    setScreen(target);
  };

  const toggleMenuMusic = () => {
    if (menuMusic.playing) {
      setMenuMusicEnabled(false);
      menuMusic.stop();
    } else {
      setMenuMusicEnabled(true);
      menuMusic.start();
    }
  };

  const togglePause = () => {
    const state = stateRef.current;
    if (state.status !== "PLAYING" && state.status !== "PAUSED") return;
    state.status = state.status === "PLAYING" ? "PAUSED" : "PLAYING";
    stopSounds();
    playSound("ui");
    forceRender();
  };

  useEffect(() => {
    if (screen === "GAME" && gameState.status !== "PLAYING") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotJumpAnim, {
          toValue: -9,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(mascotJumpAnim, {
          toValue: 3,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mascotJumpAnim, screen, gameState.status]);

  const triggerHaptic = useCallback(
    (ms = 25) => {
      if (hapticsEnabled && Platform.OS !== "web") {
        Vibration.vibrate(ms);
      }
    },
    [hapticsEnabled]
  );

  const handleResolution = useCallback((state: EngineState, summary: LockResolutionSummary) => {
    playSoundSequence(getResolutionSounds(summary));
    if (summary.stoneLanded) triggerHaptic(65);
    if (summary.specialTriggered) {
      setBannerText(t(summary.specialTriggered === "BOMB" ? "bombBlast" : summary.specialTriggered === "FLASH" ? "flashBlast" : "starBlast"));
      triggerHaptic(50);
    } else if (summary.chainDepth >= 2) {
      setBannerText(t("cascade", { count: summary.chainDepth }));
      triggerHaptic(40);
    } else if (summary.levelUp) {
      setBannerText(t("levelUp", { level: state.level }));
    } else if (summary.clearedCount > 0) {
      setBannerText(`+${summary.scoreDelta}`);
      triggerHaptic(20);
    }
    if (summary.gameOver) finishGame(state);
  }, [playSoundSequence, triggerHaptic, t, finishGame]);

  const syncSmoothPieceAnimation = useCallback(
    (s: EngineState, immediateX = false) => {
      const p = s.activePiece;
      if (!p || s.status !== "PLAYING") return;

      const intervalMs = getFallIntervalMs(s.config, s.level);

      if (immediateX) {
        animX.setValue(p.x * CELL_SIZE);
      } else {
        Animated.timing(animX, {
          toValue: p.x * CELL_SIZE,
          duration: 85,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }

      animY.stopAnimation();
      animY.setValue(p.y * CELL_SIZE);
      if (canPlacePiece(s.grid, p, p.x, p.y + 1)) {
        Animated.timing(animY, {
          toValue: (p.y + 1) * CELL_SIZE,
          duration: intervalMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start();
      }
    },
    [animX, animY]
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextAppState) => {
      if (screen === "GAME" && nextAppState !== "active" && stateRef.current.status === "PLAYING") {
        stateRef.current.status = "PAUSED";
        forceRender();
      }
    });
    return () => sub.remove();
  }, [forceRender, screen]);

  useFocusEffect(useCallback(() => () => {
    if (screen === "GAME" && stateRef.current.status === "PLAYING") {
      stateRef.current.status = "PAUSED";
      forceRender();
    }
  }, [forceRender, screen]));

  useEffect(() => {
    if (screen !== "GAME" || gameState.status !== "PLAYING") {
      animX.stopAnimation();
      animY.stopAnimation();
      return;
    }
    const intervalMs = getFallIntervalMs(gameState.config, gameState.level);

    syncSmoothPieceAnimation(stateRef.current, true);

    const timer = setInterval(() => {
      const s = stateRef.current;
      if (s.status !== "PLAYING") return;
      const prevPiece = s.activePiece;
      const summary = stepGravityTick(s);

      if (summary) handleResolution(s, summary);

      const spawnedNew = prevPiece !== s.activePiece && s.activePiece?.y === 0;
      syncSmoothPieceAnimation(s, spawnedNew);
      forceRender();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    screen,
    gameState.status,
    gameState.level,
    gameState.config,
    forceRender,
    handleResolution,
    syncSmoothPieceAnimation,
    animX,
    animY,
  ]);

  useEffect(() => {
    if (!bannerText) return;
    const t = setTimeout(() => setBannerText(null), 1000);
    return () => clearTimeout(t);
  }, [bannerText]);

  const startNewGame = (mode: GameMode) => {
    setPendingNewGameMode(null);
    menuMusic.stop();
    stopSounds();
    playSound("start");
    const fresh = createNewGameState(mode, {
      rotationMode: rotationStrategy,
      experimentalFourBlockPieces: experimental4Block,
    });
    stateRef.current = fresh;
    forceRender();
    setBannerText(null);
    if (fresh.activePiece) {
      animX.setValue(fresh.activePiece.x * CELL_SIZE);
      animY.setValue(fresh.activePiece.y * CELL_SIZE);
    }
    setScreen("GAME");
  };

  const requestNewGame = (mode: GameMode) => {
    if (currentGame) {
      playSound("ui");
      setPendingNewGameMode(mode);
    } else {
      startNewGame(mode);
    }
  };

  const cancelNewGame = () => {
    playSound("ui");
    setPendingNewGameMode(null);
  };

  const resumeSavedGame = () => {
    if (!currentGame) return;
    const restored = { ...snapshotEngineState(currentGame), config: { ...currentGame.config } };
    restored.status = "PLAYING";
    stateRef.current = restored;
    setRotationStrategy(restored.config.rotationMode);
    setBannerText(null);
    menuMusic.stop();
    stopSounds();
    playSound("ui");
    forceRender();
    animX.setValue(restored.activePiece!.x * CELL_SIZE);
    animY.setValue(restored.activePiece!.y * CELL_SIZE);
    setScreen("GAME");
  };

  const handleMoveLeft = () => {
    const state = stateRef.current;
    if (movePiece(state, -1, 0)) {
      playSound("move");
      triggerHaptic(10);
      Animated.timing(animX, {
        toValue: state.activePiece!.x * CELL_SIZE,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      forceRender();
    }
  };

  const handleMoveRight = () => {
    const state = stateRef.current;
    if (movePiece(state, 1, 0)) {
      playSound("move");
      triggerHaptic(10);
      Animated.timing(animX, {
        toValue: state.activePiece!.x * CELL_SIZE,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      forceRender();
    }
  };

  const handleRotate = () => {
    const state = stateRef.current;
    if (rotateActivePiece(state)) {
      playSound("rotate");
      triggerHaptic(15);
      Animated.timing(animX, {
        toValue: state.activePiece!.x * CELL_SIZE,
        duration: 60,
        useNativeDriver: true,
      }).start();
      forceRender();
    }
  };

  const handleSoftDrop = () => {
    const s = stateRef.current;
    if (s.status !== "PLAYING") return;
    const summary = stepGravityTick(s);
    if (summary) handleResolution(s, summary);
    else playSound("move");
    syncSmoothPieceAnimation(s, summary !== null);
    triggerHaptic(10);
    forceRender();
  };

  const handleHardDrop = () => {
    const state = stateRef.current;
    if (state.status !== "PLAYING" || !state.config.allowHardDrop || !state.activePiece) return;
    state.activePiece.y = getGhostY(state.grid, state.activePiece);
    const summary = lockActivePieceAndResolve(state);
    handleResolution(state, summary);
    syncSmoothPieceAnimation(state, true);
    triggerHaptic(45);
    forceRender();
  };

  const renderBlockTile = (cell: Cell, size: number, isGhost = false) => {
    if (cell.kind === "EMPTY") return null;

    if (cell.kind === "STONE") {
      return (
        <View
          style={[
            styles.cushionOuter,
            styles.stoneOuter,
            { width: size - 2, height: size - 2 },
          ]}
        >
          <View style={styles.stoneInner}>
            <View style={styles.shineCorner} />
            <Text style={[styles.emblemText, { fontSize: size * 0.42 }]}>
              🪨
            </Text>
          </View>
        </View>
      );
    }

    if (cell.kind === "BOMB" || cell.kind === "FLASH" || cell.kind === "STAR") {
      const bg =
        cell.kind === "BOMB"
          ? "#D84315"
          : cell.kind === "FLASH"
          ? "#00838F"
          : "#F57F17";
      const icon =
        cell.kind === "BOMB" ? "💣" : cell.kind === "FLASH" ? "⚡" : "⭐";
      return (
        <View
          style={[
            styles.cushionOuter,
            {
              width: size - 2,
              height: size - 2,
              backgroundColor: bg,
              borderColor: "#FFF59D",
            },
          ]}
        >
          <View style={styles.shineCorner} />
          <Text style={{ fontSize: size * 0.48 }}>{icon}</Text>
        </View>
      );
    }

    const theme = NORMAL_BLOCKS[(cell.colorId ?? 0) % NORMAL_BLOCKS.length];
    return (
      <View
        style={[
          styles.cushionOuter,
          {
            width: size - 2,
            height: size - 2,
            backgroundColor: isGhost ? "transparent" : theme.outer,
            borderTopColor: theme.highlight,
            borderLeftColor: theme.highlight,
            borderRightColor: theme.deep,
            borderBottomColor: theme.deep,
            opacity: isGhost ? 0.38 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.cushionBody,
            { backgroundColor: isGhost ? "transparent" : theme.body },
          ]}
        >
          {!isGhost && <View style={styles.shineCorner} />}
          <View
            style={[styles.innerEmblemWell, { backgroundColor: theme.deep }]}
          >
            <Text
              style={[
                styles.emblemSymbol,
                { color: theme.highlight, fontSize: size * 0.34 },
              ]}
            >
              {colorblindGlyphs ? theme.symbol : "•"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (screen === "TITLE") {
    const heroMascot = MASCOTS[0];
    const languageLabel = LANGUAGES.find((option) => option.code === language)!.label;
    return (
      <>
      <ScrollView style={styles.titleScreen} contentContainerStyle={styles.titleContainer}>
        <View style={styles.homeTopBar}>
          <TouchableOpacity
            style={styles.homeLanguageButton}
            accessibilityRole="button"
            accessibilityLabel={t(menuMusic.playing ? "pauseMenuMusic" : "playMenuMusic")}
            accessibilityState={{ disabled: !soundsEnabled || !menuMusic.ready }}
            aria-pressed={menuMusic.playing}
            disabled={!soundsEnabled || !menuMusic.ready}
            onPress={toggleMenuMusic}
          >
            <Text style={styles.homeLanguageIcon}>♫</Text>
            <Text style={styles.homeLanguageLabel}>{t(menuMusic.playing ? "on" : "off")}</Text>
          </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeLanguageButton}
          accessibilityRole="button"
          accessibilityLabel={t("languageShortcut", { language: languageLabel })}
          onPress={() => showScreen("SETTINGS")}
        >
          <Text style={styles.homeLanguageIcon}>🌐</Text>
          <Text style={styles.homeLanguageLabel}>{languageLabel}</Text>
          <Text style={styles.homeLanguageLabel}>›</Text>
        </TouchableOpacity>
        </View>
        <View style={styles.logoStack}>
          <Text style={styles.logoGalaxy}>Galaxy</Text>
          <View style={styles.logoSwoosh} />
          <Text style={styles.logoBalls}>Balls</Text>
        </View>
        <View style={styles.titleCenterpiece}>
          <View style={styles.titlePlanetPurple} />
          <View style={styles.titlePlanetIce} />
          <View style={styles.titlePlanetOrange} />
          <View style={{ marginBottom: 24 }}>
            <UfoCompetitorAvatar
              mascot={heroMascot}
              mood="HAPPY"
              jumpAnim={mascotJumpAnim}
            />
          </View>
        </View>
        <View style={styles.menuButtonList}>
          {currentGame && (
            <View style={{ gap: 6 }}>
              <TouchableOpacity
                style={styles.goldMenuBtn}
                accessibilityRole="button"
                accessibilityLabel={t("continueGame")}
                onPress={resumeSavedGame}
              >
                <Text style={styles.goldMenuBtnText}>▶ {t("continueGame")}</Text>
                <Text style={[styles.modeHint, { color: "#302009" }]}>
                  {t("savedRun", {
                    mode: t(currentGame.config.mode === "CLASSIC" ? "classic" : currentGame.config.mode === "COMFORT" ? "comfort" : "practice"),
                    score: currentGame.score,
                    level: currentGame.level,
                  })}
                </Text>
              </TouchableOpacity>
              <Text style={styles.modeHint}>{t("replaceSavedGameHint")}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.goldMenuBtn}
            onPress={() => requestNewGame("CLASSIC")}
          >
            <Text style={styles.goldMenuBtnText}>▶ {t("playClassic")}</Text>
            <Text style={[styles.modeHint, { color: "#302009" }]}>{t("classicHint")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.darkMenuBtn}
            onPress={() => requestNewGame("COMFORT")}
          >
            <Text style={styles.darkMenuBtnText}>⚡ {t("playComfort")}</Text>
            <Text style={styles.modeHint}>{t("quickPlayHint")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.darkMenuBtn}
            accessibilityRole="button"
            accessibilityLabel={t("otherGames")}
            onPress={() => {
              playSound("ui");
              menuMusic.start();
              router.navigate("/explore");
            }}
          >
            <Text style={styles.darkMenuBtnText}>{t("otherGames")}</Text>
          </TouchableOpacity>
          <View style={styles.menuRow}>
            <TouchableOpacity
              style={styles.halfBtn}
              onPress={() => showScreen("HOWTO")}
            >
              <Text style={styles.halfBtnText}>📖 {t("rules")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.halfBtn}
              onPress={() => showScreen("HIGHSCORES")}
            >
              <Text style={styles.halfBtnText}>🏆 {t("topFive")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.halfBtn}
              onPress={() => showScreen("SETTINGS")}
            >
              <Text style={styles.halfBtnText}>⚙️ {t("setup")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <NewGameConfirmation
        mode={pendingNewGameMode}
        onCancel={cancelNewGame}
        onConfirm={() => {
          if (pendingNewGameMode !== null) startNewGame(pendingNewGameMode);
        }}
      />
      </>
    );
  }

  if (screen === "HOWTO") {
    return (
      <ScrollView
        style={styles.modalScreen}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={styles.sectionHeader}>📖 {t("howToPlay")}</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t("matchTitle")}</Text>
          <Text style={styles.infoBody}>{t("matchRules")}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t("specialsTitle")}</Text>
          <Text style={styles.infoBody}>
            {t("stoneRules")}{"\n"}{t("bombRules")}{"\n"}{t("flashRules")}{"\n"}{t("starRules")}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t("controlsTitle")}</Text>
          <Text style={styles.infoBody}>{t("controlsRules")}</Text>
        </View>
        <TouchableOpacity
          style={styles.goldMenuBtn}
          onPress={() => showScreen("TITLE")}
        >
          <Text style={styles.goldMenuBtnText}>◀ {t("backToMenu")}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === "HIGHSCORES") {
    return (
      <ScrollView
        style={styles.modalScreen}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={styles.sectionHeader}>🏆 {t("highScores")}</Text>
        {(["CLASSIC", "COMFORT"] as GameMode[]).map((mode) => (
          <View key={mode} style={styles.infoCard}>
            <Text style={styles.infoTitle}>{t(mode === "CLASSIC" ? "classic" : "comfort")}</Text>
            {highScores[mode].map((entry, idx) => (
              <View key={idx} style={styles.scoreRow}>
                <Text style={styles.scoreRank}>
                  #{idx + 1} {entry.alias}
                </Text>
                <Text style={styles.scoreVal}>
                  {t("scoreEntry", { score: entry.score, level: entry.level })}
                </Text>
              </View>
            ))}
          </View>
        ))}
        <TouchableOpacity
          style={styles.goldMenuBtn}
          onPress={() => showScreen("TITLE")}
        >
          <Text style={styles.goldMenuBtnText}>◀ {t("backToMenu")}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === "SETTINGS") {
    return (
      <ScrollView
        style={styles.modalScreen}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={styles.sectionHeader}>⚙️ {t("settings")}</Text>
        {saveFailed && <Text accessibilityRole="alert" style={styles.infoBody}>{t("saveFailed")}</Text>}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t("language")}</Text>
          <Text style={styles.infoBody}>{t("languageHint")}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t("language")} style={styles.languageOptions}>
            {LANGUAGES.map((option) => (
              <TouchableOpacity
                key={option.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === option.code }}
                aria-checked={language === option.code}
                accessibilityLabel={option.label}
                style={[styles.languageOption, language === option.code && styles.languageSelected]}
                onPress={() => {
                  setLanguage(option.code);
                  showScreen("TITLE");
                }}
              >
                <Text style={styles.languageLabel}>
                  {language === option.code ? "●" : "○"} {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.toggleRow}
          accessibilityRole="switch"
          accessibilityLabel={t("soundEffects")}
          accessibilityState={{ checked: soundsEnabled }}
          aria-checked={soundsEnabled}
          onPress={() => {
            stopSounds();
            if (soundsEnabled) menuMusic.stop();
            setSoundsEnabled(!soundsEnabled);
          }}
        >
          <Text style={styles.toggleLabel}>{t("soundEffects")}</Text>
          <Text style={styles.toggleValue}>{t(soundsEnabled ? "on" : "off")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleRow, !soundsEnabled && { opacity: 0.45 }]}
          accessibilityRole="switch"
          accessibilityLabel={t("menuMusic")}
          accessibilityState={{ checked: menuMusicEnabled, disabled: !soundsEnabled }}
          aria-checked={menuMusicEnabled}
          disabled={!soundsEnabled}
          onPress={() => {
            playSound("ui");
            if (menuMusicEnabled) menuMusic.stop();
            else menuMusic.start();
            setMenuMusicEnabled(!menuMusicEnabled);
          }}
        >
          <Text style={styles.toggleLabel}>{t("menuMusic")}</Text>
          <Text style={styles.toggleValue}>{t(menuMusicEnabled ? "on" : "off")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.darkMenuBtn, !soundsEnabled && { opacity: 0.45 }]}
          accessibilityRole="button"
          accessibilityLabel={t("testSound")}
          accessibilityState={{ disabled: !soundsEnabled }}
          disabled={!soundsEnabled}
          onPress={() => playSound("clear")}
        >
          <Text style={styles.darkMenuBtnText}>♫ {t("testSound")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            playSound("ui");
            setHapticsEnabled(!hapticsEnabled);
          }}
        >
          <Text style={styles.toggleLabel}>{t("haptics")}</Text>
          <Text style={styles.toggleValue}>
            {t(hapticsEnabled ? "on" : "off")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            playSound("ui");
            setColorblindGlyphs(!colorblindGlyphs);
          }}
        >
          <Text style={styles.toggleLabel}>{t("emblems")}</Text>
          <Text style={styles.toggleValue}>
            {t(colorblindGlyphs ? "on" : "off")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => {
            playSound("ui");
            setRotationStrategy(
              rotationStrategy === "GEOMETRY_90" ? "COLOR_CYCLE" : "GEOMETRY_90"
            );
          }}
        >
          <Text style={styles.toggleLabel}>{t("rotationMode")}</Text>
          <Text style={styles.toggleValue}>{t(rotationStrategy === "GEOMETRY_90" ? "geometryRotation" : "colorRotation")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.darkMenuBtn}
          onPress={() => {
            const res = runAllEngineTests();
            setTestReport(res.log);
          }}
        >
          <Text style={styles.darkMenuBtnText}>🧪 {t("runTests")}</Text>
        </TouchableOpacity>
        {testReport && (
          <View style={styles.infoCard}>
            {testReport.map((line, idx) => (
              <Text key={idx} style={styles.testLine}>
                {line}
              </Text>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.goldMenuBtn}
          onPress={() => showScreen("TITLE")}
        >
          <Text style={styles.goldMenuBtnText}>◀ {t("backToMenu")}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const mascot = MASCOTS[gameState.mascotIndex] || MASCOTS[0];
  const modeHighList = highScores[gameState.config.mode] || [];
  const topHighScore = Math.max(
    gameState.score,
    modeHighList.length > 0 ? modeHighList[0].score : 0
  );
  const ghostY =
    gameState.config.showGhostPiece && gameState.activePiece
      ? getGhostY(gameState.grid, gameState.activePiece)
      : null;
  const nextPiecePreview = getPiecePreview(gameState.nextPiece);

  return (
    <View style={styles.playScreen}>
      <View style={styles.orangeScoreHeader}>
          <Text style={styles.orangeHeaderText} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1}>
          {t("score")} {gameState.score} · {t("high")} {topHighScore}
        </Text>
        <TouchableOpacity
          style={styles.headerPausePill}
          accessibilityLabel={t("pause")}
          onPress={togglePause}
        >
          <Text style={styles.headerPauseText}>
            {gameState.status === "PAUSED" ? "▶" : "❚❚"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spaceSkyBanner}>
        <Text style={styles.spaceSkyStars}>
          ✦ * · ★ {bannerText || t("level", { level: gameState.level })} · ✦
        </Text>
      </View>

      <View style={styles.arenaRow}>
        <View style={styles.goldenBoardFrame}>
          <View style={styles.boardInnerGrid}>
            {Array.from({ length: GRID_ROWS }).map((_, r) => (
              <View key={r} style={styles.boardRow}>
                {Array.from({ length: GRID_COLS }).map((__, c) => {
                  const settledCell = gameState.grid[r][c];
                  let ghostCell: Cell | null = null;

                  if (
                    settledCell.kind === "EMPTY" &&
                    ghostY !== null &&
                    gameState.activePiece
                  ) {
                    for (const part of gameState.activePiece.cells) {
                      if (
                        ghostY + part.dy === r &&
                        gameState.activePiece.x + part.dx === c
                      ) {
                        ghostCell = { kind: part.kind, colorId: part.colorId };
                      }
                    }
                  }

                  return (
                    <View
                      key={c}
                      style={[
                        styles.iceGridCell,
                        { width: CELL_SIZE, height: CELL_SIZE },
                        highContrast && {
                          borderColor: "#5C9EAD",
                          borderWidth: 1,
                        },
                      ]}
                    >
                      {settledCell.kind !== "EMPTY"
                        ? renderBlockTile(settledCell, CELL_SIZE, false)
                        : ghostCell
                        ? renderBlockTile(ghostCell, CELL_SIZE, true)
                        : null}
                    </View>
                  );
                })}
              </View>
            ))}

            {gameState.activePiece && (
              <Animated.View
                testID="active-piece"
                pointerEvents="none"
                style={[
                  styles.activePieceOverlay,
                  {
                    transform: [{ translateX: animX }, { translateY: animY }],
                  },
                ]}
              >
                {gameState.activePiece.cells.map((part, idx) => (
                  <View
                    key={idx}
                    style={{
                      position: "absolute",
                      left: part.dx * CELL_SIZE,
                      top: part.dy * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {renderBlockTile(
                      { kind: part.kind, colorId: part.colorId },
                      CELL_SIZE,
                      false
                    )}
                  </View>
                ))}
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.rightColumn}>
          <View style={styles.previewWithBridgeRow}>
            <View style={styles.goldenBridgeTab} />
            <View style={styles.goldenPreviewFrame}>
              <View testID="next-piece-preview" style={styles.creamPreviewInner}>
                {nextPiecePreview.map((row, pr) => (
                  <View key={pr} style={styles.boardRow}>
                    {row.map((previewCell, pc) => (
                        <View
                          key={pc}
                          style={[
                            styles.creamPreviewCell,
                            {
                              width: PREVIEW_CELL_SIZE,
                              height: PREVIEW_CELL_SIZE,
                            },
                          ]}
                        >
                          {renderBlockTile(
                            previewCell,
                            PREVIEW_CELL_SIZE,
                            false
                          )}
                        </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.competitorStage}>
            <UfoCompetitorAvatar
              mascot={mascot}
              mood={gameState.mascotMood}
              jumpAnim={mascotJumpAnim}
            />
            <Text style={styles.pilotNameTag}>{mascot.name}</Text>
          </View>
        </View>
      </View>

      <GameControls
        enabled={gameState.status === "PLAYING"}
        allowHardDrop={gameState.config.allowHardDrop}
        onLeft={handleMoveLeft}
        onDown={handleSoftDrop}
        onRight={handleMoveRight}
        onRotate={handleRotate}
        onDrop={handleHardDrop}
      />

      <Modal
        visible={
          gameState.status === "PAUSED" || gameState.status === "GAME_OVER"
        }
        transparent
        animationType="fade"
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>
              {t(gameState.status === "GAME_OVER" ? "gameOver" : "paused")}
            </Text>
            <Text style={styles.overlayScore}>
              {t("score")}: {gameState.score} · {t("high")}: {topHighScore}
            </Text>
            {gameState.status === "PAUSED" ? (
              <TouchableOpacity
                style={styles.goldMenuBtn}
                onPress={togglePause}
              >
                <Text style={styles.goldMenuBtnText}>▶ {t("resume")}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.goldMenuBtn}
                onPress={() => requestNewGame(gameState.config.mode)}
              >
                <Text style={styles.goldMenuBtnText}>🔄 {t("playAgain")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.darkMenuBtn}
              onPress={() => showScreen("TITLE")}
            >
              <Text style={styles.darkMenuBtnText}>🏠 {t("mainMenu")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  titleScreen: {
    flex: 1,
    backgroundColor: "#020412",
  },
  titleContainer: {
    flexGrow: 1,
    backgroundColor: "#020412",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 48,
    paddingTop: Platform.OS === "web" ? 80 : 48,
    paddingHorizontal: 22,
    gap: 12,
  },
  homeTopBar: {
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  modeHint: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 4,
  },
  homeLanguageButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    maxWidth: "100%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 24,
  },
  homeLanguageIcon: {
    fontSize: 18,
    color: "#FDE68A",
  },
  homeLanguageLabel: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  logoStack: {
    alignItems: "center",
    marginTop: 6,
  },
  logoGalaxy: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "#3B82F6",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  logoSwoosh: {
    width: 140,
    height: 6,
    backgroundColor: "#60A5FA",
    borderRadius: 4,
    marginVertical: 2,
  },
  logoBalls: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 3,
    marginLeft: 36,
    textShadowColor: "#2563EB",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  titleCenterpiece: {
    width: 260,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
  },
  titlePlanetPurple: {
    position: "absolute",
    left: 10,
    bottom: 42,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4C1D95",
    borderWidth: 3,
    borderColor: "#7C3AED",
  },
  titlePlanetOrange: {
    position: "absolute",
    right: 8,
    bottom: 28,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#EA580C",
    borderWidth: 3,
    borderColor: "#FDBA74",
  },
  titlePlanetIce: {
    position: "absolute",
    bottom: 10,
    width: 130,
    height: 72,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 4,
    borderColor: "#93C5FD",
  },
  menuButtonList: {
    width: "100%",
    maxWidth: 340,
    gap: 10,
  },
  goldMenuBtn: {
    backgroundColor: "#F59B1A",
    borderWidth: 2,
    borderColor: "#FDE68A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  goldMenuBtnText: {
    color: "#1C1917",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  darkMenuBtn: {
    backgroundColor: "#1E293B",
    borderWidth: 1.5,
    borderColor: "#F59B1A",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  darkMenuBtnText: {
    color: "#FDE68A",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  menuRow: {
    flexDirection: "row",
    gap: 8,
  },
  halfBtn: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  halfBtnText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  playScreen: {
    flex: 1,
    backgroundColor: "#020518",
    paddingTop: Platform.OS === "ios" ? 48 : Platform.OS === "web" ? 70 : 34,
    paddingBottom: 14,
    justifyContent: "space-between",
  },
  orangeScoreHeader: {
    backgroundColor: "#F59B1A",
    borderTopWidth: 2,
    borderTopColor: "#FDE68A",
    borderBottomWidth: 3,
    borderBottomColor: "#B45309",
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orangeHeaderText: {
    flex: 1,
    color: "#1A1105",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerPausePill: {
    backgroundColor: "#B45309",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerPauseText: {
    color: "#FFFBEB",
    fontSize: 14,
    fontWeight: "900",
  },
  spaceSkyBanner: {
    alignItems: "center",
    paddingVertical: 2,
  },
  spaceSkyStars: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  arenaRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 8,
  },
  goldenBoardFrame: {
    backgroundColor: "#F5A623",
    padding: 6,
    borderRadius: 8,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopColor: "#FDE68A",
    borderLeftColor: "#FDE68A",
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderRightColor: "#B45309",
    borderBottomColor: "#B45309",
  },
  boardInnerGrid: {
    backgroundColor: "#BCE3E8",
    borderWidth: 2,
    borderColor: "#88B3BA",
    position: "relative",
    overflow: "hidden",
  },
  boardRow: {
    flexDirection: "row",
  },
  iceGridCell: {
    backgroundColor: "#BCE3E8",
    borderWidth: 1,
    borderColor: "#DDF2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  activePieceOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  cushionOuter: {
    borderRadius: 6,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cushionBody: {
    flex: 1,
    width: "100%",
    borderRadius: 3.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  shineCorner: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  innerEmblemWell: {
    width: "54%",
    height: "54%",
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  emblemSymbol: {
    fontWeight: "900",
    lineHeight: 15,
  },
  stoneOuter: {
    backgroundColor: "#374151",
    borderTopColor: "#9CA3AF",
    borderLeftColor: "#9CA3AF",
    borderRightColor: "#111827",
    borderBottomColor: "#111827",
  },
  stoneInner: {
    flex: 1,
    width: "100%",
    backgroundColor: "#4B5563",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  emblemText: {
    color: "#F3F4F6",
  },
  rightColumn: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  previewWithBridgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  goldenBridgeTab: {
    width: 10,
    height: 16,
    backgroundColor: "#F5A623",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderTopColor: "#FDE68A",
    borderBottomColor: "#B45309",
  },
  goldenPreviewFrame: {
    backgroundColor: "#F5A623",
    padding: 5,
    borderRadius: 6,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopColor: "#FDE68A",
    borderLeftColor: "#FDE68A",
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    borderRightColor: "#B45309",
    borderBottomColor: "#B45309",
  },
  creamPreviewInner: {
    backgroundColor: "#F7F5D7",
    borderWidth: 1.5,
    borderColor: "#C8C294",
  },
  creamPreviewCell: {
    backgroundColor: "#F7F5D7",
    borderWidth: 1,
    borderColor: "#E5E2B8",
    alignItems: "center",
    justifyContent: "center",
  },
  competitorStage: {
    width: PREVIEW_CELL_SIZE * 3 + 22,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  ufoSceneContainer: {
    width: 112,
    height: 145,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ufoStars: {
    position: "absolute",
    top: 0,
    color: "#CBD5E1",
    fontSize: 11,
    letterSpacing: 3,
  },
  bluePlanetHorizon: {
    position: "absolute",
    bottom: 0,
    width: 112,
    height: 48,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: "#1D4ED8",
    borderTopWidth: 3,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#93C5FD",
    overflow: "hidden",
    alignItems: "center",
  },
  bluePlanetGlow: {
    width: 80,
    height: 16,
    borderRadius: 10,
    backgroundColor: "#60A5FA",
    marginTop: 4,
    opacity: 0.6,
  },
  ufoWrapper: {
    alignItems: "center",
    marginBottom: 14,
  },
  cockpitGlass: {
    position: "absolute",
    top: -4,
    width: 68,
    height: 54,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: "rgba(148, 163, 184, 0.32)",
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.65)",
  },
  creatureHead: {
    width: 54,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  creatureEar: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  earLeft: {
    left: 2,
  },
  earRight: {
    right: 2,
  },
  stripeRow: {
    flexDirection: "row",
    gap: 3,
    marginBottom: 2,
  },
  stripeBar: {
    width: 3,
    height: 6,
    backgroundColor: "#451A03",
    borderRadius: 1,
  },
  eyeRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 2,
  },
  eyeBall: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  eyePupil: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#020617",
  },
  happyEyeArch: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "900",
  },
  cheekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  puffyCheek: {
    width: 16,
    height: 11,
    borderRadius: 6,
  },
  noseMouthBox: {
    alignItems: "center",
    marginHorizontal: 2,
  },
  cuteNose: {
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#7C2D12",
  },
  cuteMouth: {
    width: 8,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: "#DC2626",
    marginTop: 1,
  },
  saucerCollar: {
    width: 58,
    height: 8,
    backgroundColor: "#EF4444",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginTop: -4,
    zIndex: 3,
  },
  saucerDiscOuter: {
    width: 86,
    height: 24,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -3,
    zIndex: 4,
  },
  saucerDiscInner: {
    width: 68,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#94A3B8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },
  saucerLightDot: {
    width: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#475569",
  },
  pilotNameTag: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 5, 24, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  overlayCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#0F172A",
    borderWidth: 3,
    borderColor: "#F5A623",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  overlayTitle: {
    color: "#F59B1A",
    fontSize: 22,
    fontWeight: "900",
  },
  overlayScore: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalScreen: {
    flex: 1,
    backgroundColor: "#020518",
  },
  modalContent: {
    padding: 24,
    paddingTop: 52,
    gap: 12,
  },
  sectionHeader: {
    color: "#F59B1A",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },
  infoCard: {
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "#F5A623",
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    color: "#FDE68A",
    fontSize: 15,
    fontWeight: "bold",
  },
  infoBody: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 19,
  },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E293B",
  },
  scoreRank: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  scoreVal: {
    color: "#F59B1A",
    fontWeight: "bold",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    minHeight: 52,
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleValue: {
    flex: 1,
    textAlign: "right",
    color: "#F59B1A",
    fontSize: 14,
    fontWeight: "900",
  },
  testLine: {
    color: "#4ADE80",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  languageOptions: {
    gap: 8,
    marginTop: 6,
  },
  languageOption: {
    minHeight: 48,
    padding: 12,
    justifyContent: "center",
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 8,
  },
  languageSelected: {
    backgroundColor: "#3B2B12",
    borderColor: "#F59B1A",
  },
  languageLabel: {
    color: "#F8FAFC",
    fontSize: 16,
  },
});
