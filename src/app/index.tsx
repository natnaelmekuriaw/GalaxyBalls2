// src/app/(tabs)/index.tsx (or src/app/index.tsx)
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
  HighScoreEntry,
  MASCOTS,
  PREVIEW_SIZE,
  createNewGameState,
  getFallIntervalMs,
  getGhostY,
  lockActivePieceAndResolve,
  movePiece,
  rotateActivePiece,
  stepGravityTick,
} from "../engine/galaxyEngine";
import { runAllEngineTests } from "../engine/galaxyEngine.test";

// Note: If you place this file directly inside `src/app/index.tsx` instead of `src/app/(tabs)/index.tsx`,
// change `../../engine/galaxyEngine` above to `../engine/galaxyEngine`.

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CELL_SIZE = Math.min(
  Math.floor((SCREEN_WIDTH * 0.58) / GRID_COLS),
  Math.floor((SCREEN_HEIGHT * 0.56) / GRID_ROWS)
);

const NORMAL_COLORS = [
  { bg: "#FF4B5C", border: "#FF8A95", glyph: "●", name: "Ruby" },
  { bg: "#00F5D4", border: "#80FFEC", glyph: "◆", name: "Cyan" },
  { bg: "#FEE440", border: "#FFF29C", glyph: "▲", name: "Solar" },
  { bg: "#9B5DE5", border: "#CBA4F5", glyph: "■", name: "Nova" },
  { bg: "#00BBF9", border: "#8ADFFF", glyph: "✦", name: "Comet" },
];

export default function OrbitBlocksApp() {
  const [screen, setScreen] = useState<
    "TITLE" | "GAME" | "HIGHSCORES" | "HOWTO" | "SETTINGS"
  >("TITLE");
  const [gameState, setGameState] = useState<EngineState>(() =>
    createNewGameState("CLASSIC")
  );
  const [, setTickCount] = useState(0);

  // Settings & Accessibility state
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [colorblindGlyphs, setColorblindGlyphs] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [rotationStrategy, setRotationStrategy] = useState<
    "GEOMETRY_90" | "COLOR_CYCLE"
  >("GEOMETRY_90");
  const [experimental4Block, setExperimental4Block] = useState(false);

  // Local Top 5 High Scores per mode
  const [highScores, setHighScores] = useState<
    Record<GameMode, HighScoreEntry[]>
  >({
    CLASSIC: [
      { alias: "NOK", score: 1250, level: 5, date: "2026-10-14" },
      { alias: "ORB", score: 840, level: 4, date: "2026-10-14" },
      { alias: "GAL", score: 520, level: 3, date: "2026-10-14" },
    ],
    COMFORT: [
      { alias: "MOD", score: 1480, level: 6, date: "2026-10-14" },
      { alias: "ZEN", score: 910, level: 4, date: "2026-10-14" },
    ],
    PRACTICE: [],
  });

  const [testReport, setTestReport] = useState<string[] | null>(null);
  const [bannerText, setBannerText] = useState<string | null>(null);
  const stateRef = useRef<EngineState>(gameState);
  stateRef.current = gameState;

  const forceRender = useCallback(() => setTickCount((t) => t + 1), []);

  const triggerHaptic = useCallback(
    (ms = 25) => {
      if (hapticsEnabled && Platform.OS !== "web") {
        Vibration.vibrate(ms);
      }
    },
    [hapticsEnabled]
  );

  const recordHighScore = useCallback(
    (mode: GameMode, score: number, level: number) => {
      if (mode === "PRACTICE" || score <= 0) return;
      setHighScores((prev) => {
        const updated = [
          ...prev[mode],
          {
            alias: "YOU",
            score,
            level,
            date: new Date().toISOString().slice(0, 10),
          },
        ]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        return { ...prev, [mode]: updated };
      });
    },
    []
  );

  // Auto-pause when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active" && stateRef.current.status === "PLAYING") {
        stateRef.current.status = "PAUSED";
        forceRender();
      }
    });
    return () => sub.remove();
  }, [forceRender]);

  // Core gravity loop
  useEffect(() => {
    if (screen !== "GAME" || gameState.status !== "PLAYING") return;
    const intervalMs = getFallIntervalMs(gameState.config, gameState.level);

    const timer = setInterval(() => {
      const s = stateRef.current;
      if (s.status !== "PLAYING") return;
      const summary = stepGravityTick(s);
      if (summary) {
        if (summary.stoneLanded) triggerHaptic(65);
        if (summary.specialTriggered) {
          setBannerText(`${summary.specialTriggered} BLAST!`);
          triggerHaptic(50);
        } else if (summary.chainDepth >= 2) {
          setBannerText(`${summary.chainDepth}x CASCADE COMBO!`);
          triggerHaptic(40);
        } else if (summary.levelUp) {
          setBannerText(`LEVEL ${s.level}!`);
        } else if (summary.clearedCount > 0) {
          setBannerText(`+${summary.scoreDelta} PTS`);
          triggerHaptic(20);
        }
        if (summary.gameOver) {
          recordHighScore(s.config.mode, s.score, s.level);
        }
      }
      forceRender();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    screen,
    gameState.status,
    gameState.level,
    gameState.config,
    forceRender,
    triggerHaptic,
    recordHighScore,
  ]);

  // Clear temporary banner message
  useEffect(() => {
    if (!bannerText) return;
    const t = setTimeout(() => setBannerText(null), 1100);
    return () => clearTimeout(t);
  }, [bannerText]);

  // Web keyboard support for desktop testing
  useEffect(() => {
    if (Platform.OS !== "web" || screen !== "GAME") return;
    const handleKeyDown = (e: any) => {
      const s = stateRef.current;
      if (s.status !== "PLAYING") return;
      if (e.key === "ArrowLeft" || e.key === "4") {
        movePiece(s, -1, 0);
        forceRender();
      } else if (e.key === "ArrowRight" || e.key === "6") {
        movePiece(s, 1, 0);
        forceRender();
      } else if (e.key === "ArrowUp" || e.key === "2") {
        rotateActivePiece(s);
        forceRender();
      } else if (e.key === "ArrowDown" || e.key === "5" || e.key === "8") {
        stepGravityTick(s);
        forceRender();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, forceRender]);

  const startNewGame = (mode: GameMode) => {
    const fresh = createNewGameState(mode, {
      rotationMode: rotationStrategy,
      experimentalFourBlockPieces: experimental4Block,
    });
    setGameState(fresh);
    setBannerText(`${mode} MODE`);
    setScreen("GAME");
  };

  const handleMoveLeft = () => {
    if (movePiece(gameState, -1, 0)) {
      triggerHaptic(10);
      forceRender();
    }
  };

  const handleMoveRight = () => {
    if (movePiece(gameState, 1, 0)) {
      triggerHaptic(10);
      forceRender();
    }
  };

  const handleRotate = () => {
    if (rotateActivePiece(gameState)) {
      triggerHaptic(15);
      forceRender();
    }
  };

  const handleSoftDrop = () => {
    const summary = stepGravityTick(gameState);
    if (summary?.gameOver) {
      recordHighScore(gameState.config.mode, gameState.score, gameState.level);
    }
    triggerHaptic(12);
    forceRender();
  };

  const handleHardDrop = () => {
    if (!gameState.config.allowHardDrop || !gameState.activePiece) return;
    gameState.activePiece.y = getGhostY(gameState.grid, gameState.activePiece);
    const summary = lockActivePieceAndResolve(gameState);
    if (summary.gameOver) {
      recordHighScore(gameState.config.mode, gameState.score, gameState.level);
    }
    triggerHaptic(45);
    forceRender();
  };

  const renderCellContent = (cell: Cell, isGhost = false) => {
    if (cell.kind === "EMPTY") return null;

    if (cell.kind === "STONE") {
      return (
        <View style={[styles.cellInner, styles.stoneCell]}>
          <Text style={styles.stoneGlyph}>▣</Text>
        </View>
      );
    }
    if (cell.kind === "BOMB") {
      return (
        <View style={[styles.cellInner, styles.bombCell]}>
          <Text style={styles.specialGlyph}>💣</Text>
        </View>
      );
    }
    if (cell.kind === "FLASH") {
      return (
        <View style={[styles.cellInner, styles.flashCell]}>
          <Text style={styles.specialGlyph}>⚡</Text>
        </View>
      );
    }
    if (cell.kind === "STAR") {
      return (
        <View style={[styles.cellInner, styles.starCell]}>
          <Text style={styles.specialGlyph}>⭐</Text>
        </View>
      );
    }

    const palette = NORMAL_COLORS[(cell.colorId ?? 0) % NORMAL_COLORS.length];
    return (
      <View
        style={[
          styles.cellInner,
          {
            backgroundColor: isGhost ? "transparent" : palette.bg,
            borderColor: palette.border,
            borderWidth: isGhost ? 2 : 2,
            opacity: isGhost ? 0.45 : 1,
          },
        ]}
      >
        {colorblindGlyphs && (
          <Text style={styles.normalGlyph}>{palette.glyph}</Text>
        )}
      </View>
    );
  };

  // ==================== 1. TITLE & MAIN MENU SCREEN ====================
  if (screen === "TITLE") {
    return (
      <View style={styles.titleContainer}>
        {/* Twinkling Stars & 3 Retro Planets */}
        <View style={styles.planetOne} />
        <View style={styles.planetTwo} />
        <View style={styles.planetThree} />
        <Text style={styles.starField}>✦ · ✧ ★ · ✦ ·</Text>

        {/* Animated Yellow Flying Mascot Hero */}
        <View style={styles.heroMascotBadge}>
          <Text style={styles.heroMascotEmoji}>🐝</Text>
          <Text style={styles.heroMascotHint}>Lumibee Ready!</Text>
        </View>

        <Text style={styles.gameTitle}>ORBIT BLOCKS</Text>
        <Text style={styles.gameSubtitle}>RETRO GALAXY REMAKE</Text>

        <View style={styles.menuButtonList}>
          <TouchableOpacity
            style={styles.primaryMenuBtn}
            onPress={() => startNewGame("CLASSIC")}
          >
            <Text style={styles.primaryMenuBtnText}>▶ PLAY CLASSIC (6×10)</Text>
            <Text style={styles.menuBtnSub}>
              Authentic Nokia 2330 rules & pacing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryMenuBtn}
            onPress={() => startNewGame("COMFORT")}
          >
            <Text style={styles.secondaryMenuBtnText}>
              ⚡ PLAY MODERN COMFORT
            </Text>
            <Text style={styles.menuBtnSub}>
              Ghost piece, hard drop & brisk speed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryMenuBtn}
            onPress={() => startNewGame("PRACTICE")}
          >
            <Text style={styles.secondaryMenuBtnText}>🎓 PRACTICE MODE</Text>
            <Text style={styles.menuBtnSub}>
              Relaxed speed, unranked sandbox
            </Text>
          </TouchableOpacity>

          <View style={styles.menuRow}>
            <TouchableOpacity
              style={styles.halfBtn}
              onPress={() => setScreen("HOWTO")}
            >
              <Text style={styles.halfBtnText}>📖 HOW TO PLAY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.halfBtn}
              onPress={() => setScreen("HIGHSCORES")}
            >
              <Text style={styles.halfBtnText}>🏆 TOP 5 SCORES</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setScreen("SETTINGS")}
          >
            <Text style={styles.halfBtnText}>⚙️ SETTINGS & ENGINE TESTS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== 2. HOW TO PLAY / TUTORIAL ====================
  if (screen === "HOWTO") {
    return (
      <ScrollView
        style={styles.modalScreen}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={styles.sectionHeader}>📖 HOW TO PLAY</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            1. 4-Axis Match-Three (Not Tetris!)
          </Text>
          <Text style={styles.infoBody}>
            Align 3 or more blocks of the SAME normal color horizontally,
            vertically, or diagonally (both slopes). Full rows do not clear
            unless colors match!
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>2. Heavy Stones (▣)</Text>
          <Text style={styles.infoBody}>
            Dark heavy Stones are obstacles. Connecting 3 Stones will NOT clear
            them! Destroy them using a Bomb or a Flash.
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>3. Special Single-Cell Pieces</Text>
          <Text style={styles.infoBody}>
            • 💣 BOMB: Destroys the surrounding 3×3 area on impact (including
            Stones).{"\n"}• ⚡ FLASH: Zaps the entire vertical column it lands
            in (including Stones).{"\n"}• ⭐ STAR: Removes all blocks of the
            normal color it touches across the board.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.primaryMenuBtn}
          onPress={() => setScreen("TITLE")}
        >
          <Text style={styles.primaryMenuBtnText}>◀ BACK TO MENU</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==================== 3. HIGH SCORES SCREEN ====================
  if (screen === "HIGHSCORES") {
    return (
      <ScrollView
        style={styles.modalScreen}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={styles.sectionHeader}>🏆 TOP 5 LOCAL HIGH SCORES</Text>
        {(["CLASSIC", "COMFORT"] as GameMode[]).map((mode) => (
          <View key={mode} style={styles.infoCard}>
            <Text style={styles.infoTitle}>{mode} MODE</Text>
            {highScores[mode].map((entry, idx) => (
              <View key={idx} style={styles.scoreRow}>
                <Text style={styles.scoreRank}>
                  #{idx + 1} {entry.alias}
                </Text>
                <Text style={styles.scoreVal}>
                  {entry.score} pts (Lv.{entry.level})
                </Text>
              </View>
            ))}
          </View>
        ))}
        <TouchableOpacity
          style={styles.primaryMenuBtn}
          onPress={() => setScreen("TITLE")}
        >
          <Text style={styles.primaryMenuBtnText}>◀ BACK TO MENU</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==================== 4. SETTINGS & DIAGNOSTICS ====================
  if (screen === "SETTINGS") {
    return (
      <ScrollView
        style={styles.modalScreen}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={styles.sectionHeader}>⚙️ SETTINGS & QA</Text>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setHapticsEnabled(!hapticsEnabled)}
        >
          <Text style={styles.toggleLabel}>Vibration / Haptics</Text>
          <Text style={styles.toggleValue}>
            {hapticsEnabled ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setColorblindGlyphs(!colorblindGlyphs)}
        >
          <Text style={styles.toggleLabel}>Colorblind Tile Symbols</Text>
          <Text style={styles.toggleValue}>
            {colorblindGlyphs ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setHighContrast(!highContrast)}
        >
          <Text style={styles.toggleLabel}>High Contrast Grid Borders</Text>
          <Text style={styles.toggleValue}>{highContrast ? "ON" : "OFF"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() =>
            setRotationStrategy(
              rotationStrategy === "GEOMETRY_90" ? "COLOR_CYCLE" : "GEOMETRY_90"
            )
          }
        >
          <Text style={styles.toggleLabel}>Rotation Strategy</Text>
          <Text style={styles.toggleValue}>{rotationStrategy}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setExperimental4Block(!experimental4Block)}
        >
          <Text style={styles.toggleLabel}>Experimental 4-Block Pieces</Text>
          <Text style={styles.toggleValue}>
            {experimental4Block ? "ENABLED" : "OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryMenuBtn, { marginTop: 14 }]}
          onPress={() => {
            const res = runAllEngineTests();
            setTestReport(res.log);
          }}
        >
          <Text style={styles.secondaryMenuBtnText}>
            🧪 RUN MANDATORY ENGINE UNIT TESTS
          </Text>
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
          style={styles.primaryMenuBtn}
          onPress={() => setScreen("TITLE")}
        >
          <Text style={styles.primaryMenuBtnText}>◀ BACK TO MENU</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==================== 5. MAIN PLAY SCREEN ====================
  const mascot = MASCOTS[gameState.mascotIndex] || MASCOTS[0];
  const ghostY =
    gameState.config.showGhostPiece && gameState.activePiece
      ? getGhostY(gameState.grid, gameState.activePiece)
      : null;

  return (
    <View style={styles.playContainer}>
      {/* Top Status Bar */}
      <View style={styles.topHud}>
        <View>
          <Text style={styles.hudLabel}>{gameState.config.mode}</Text>
          <Text style={styles.hudScore}>{gameState.score}</Text>
        </View>
        <View style={styles.hudCenter}>
          <Text style={styles.hudLevel}>LEVEL {gameState.level}</Text>
          {bannerText && <Text style={styles.bannerPill}>{bannerText}</Text>}
        </View>
        <TouchableOpacity
          style={styles.pauseBtn}
          onPress={() => {
            gameState.status =
              gameState.status === "PAUSED" ? "PLAYING" : "PAUSED";
            forceRender();
          }}
        >
          <Text style={styles.pauseBtnText}>
            {gameState.status === "PAUSED" ? "▶" : "❚❚"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center Stage: 6x10 Grid on Left + 3x3 Preview & Flying Mascot on Right */}
      <View style={styles.middleStage}>
        {/* 6x10 Board */}
        <View
          style={[
            styles.boardFrame,
            highContrast && { borderColor: "#FFFFFF", borderWidth: 3 },
          ]}
        >
          {Array.from({ length: GRID_ROWS }).map((_, r) => (
            <View key={r} style={styles.boardRow}>
              {Array.from({ length: GRID_COLS }).map((__, c) => {
                let cellToRender: Cell = gameState.grid[r][c];
                let isGhostCell = false;

                if (gameState.activePiece) {
                  for (const part of gameState.activePiece.cells) {
                    if (
                      gameState.activePiece.y + part.dy === r &&
                      gameState.activePiece.x + part.dx === c
                    ) {
                      cellToRender = { kind: part.kind, colorId: part.colorId };
                    } else if (
                      ghostY !== null &&
                      cellToRender.kind === "EMPTY" &&
                      ghostY + part.dy === r &&
                      gameState.activePiece.x + part.dx === c
                    ) {
                      cellToRender = { kind: part.kind, colorId: part.colorId };
                      isGhostCell = true;
                    }
                  }
                }

                return (
                  <View
                    key={c}
                    style={[
                      styles.gridCell,
                      { width: CELL_SIZE, height: CELL_SIZE },
                      highContrast && { borderColor: "#3A4750" },
                    ]}
                  >
                    {renderCellContent(cellToRender, isGhostCell)}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Right Side Panel: 3x3 Next Preview & Reactive Mascot */}
        <View style={styles.sidePanel}>
          <Text style={styles.sideTitle}>NEXT (3×3)</Text>
          <View style={styles.previewBox}>
            {Array.from({ length: PREVIEW_SIZE }).map((_, pr) => (
              <View key={pr} style={styles.boardRow}>
                {Array.from({ length: PREVIEW_SIZE }).map((__, pc) => {
                  const found = gameState.nextPiece.cells.find(
                    (part) => part.dy === pr && part.dx === pc
                  );
                  const previewCell: Cell = found
                    ? { kind: found.kind, colorId: found.colorId }
                    : { kind: "EMPTY" };
                  return (
                    <View key={pc} style={styles.previewCell}>
                      {renderCellContent(previewCell)}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Reactive Flying Space Mascot */}
          <View
            style={[styles.mascotBox, { borderColor: mascot.primaryColor }]}
          >
            <Text style={styles.mascotName}>{mascot.name}</Text>
            <Text style={styles.mascotAvatar}>{mascot.symbol}</Text>
            <Text
              style={[styles.mascotExpression, { color: mascot.primaryColor }]}
            >
              {gameState.mascotMood === "HAPPY" && "^‿^ Nice!"}
              {gameState.mascotMood === "COMBO" && "★O★ COMBO!"}
              {gameState.mascotMood === "DANGER" && "⊙﹏⊙ Careful!"}
              {gameState.mascotMood === "TRANSITION" && "🚀 Level Up!"}
              {gameState.mascotMood === "IDLE" && "•‿• Hovering"}
            </Text>
          </View>

          <View style={styles.statsBox}>
            <Text style={styles.statLine}>
              Cleared: {gameState.linesOrMatchesCleared}
            </Text>
            <Text style={styles.statLine}>
              Chain: {gameState.lastChainDepth}x
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Ergonomic Thumb Control Strip */}
      <View style={styles.controlStrip}>
        <TouchableOpacity
          style={styles.ctrlBtn}
          activeOpacity={0.65}
          onPress={handleMoveLeft}
        >
          <Text style={styles.ctrlBtnText}>◀</Text>
          <Text style={styles.ctrlSubLabel}>LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          activeOpacity={0.65}
          onPress={handleRotate}
        >
          <Text style={styles.ctrlBtnText}>↻</Text>
          <Text style={styles.ctrlSubLabel}>ROTATE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          activeOpacity={0.65}
          onPress={handleSoftDrop}
        >
          <Text style={styles.ctrlBtnText}>▼</Text>
          <Text style={styles.ctrlSubLabel}>DOWN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          activeOpacity={0.65}
          onPress={handleMoveRight}
        >
          <Text style={styles.ctrlBtnText}>▶</Text>
          <Text style={styles.ctrlSubLabel}>RIGHT</Text>
        </TouchableOpacity>

        {gameState.config.allowHardDrop && (
          <TouchableOpacity
            style={[styles.ctrlBtn, styles.hardDropBtn]}
            activeOpacity={0.65}
            onPress={handleHardDrop}
          >
            <Text style={styles.ctrlBtnText}>⏬</Text>
            <Text style={styles.ctrlSubLabel}>DROP</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pause & Game Over Modal Overlay */}
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
              {gameState.status === "GAME_OVER"
                ? "💥 TOP OUT — GAME OVER"
                : "⏸ GAME PAUSED"}
            </Text>
            <Text style={styles.overlayScore}>
              Score: {gameState.score} | Level: {gameState.level}
            </Text>

            {gameState.status === "PAUSED" ? (
              <TouchableOpacity
                style={styles.primaryMenuBtn}
                onPress={() => {
                  gameState.status = "PLAYING";
                  forceRender();
                }}
              >
                <Text style={styles.primaryMenuBtnText}>▶ RESUME</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryMenuBtn}
                onPress={() => startNewGame(gameState.config.mode)}
              >
                <Text style={styles.primaryMenuBtnText}>🔄 PLAY AGAIN</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryMenuBtn}
              onPress={() => setScreen("TITLE")}
            >
              <Text style={styles.secondaryMenuBtnText}>🏠 MAIN MENU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flex: 1,
    backgroundColor: "#070916",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  planetOne: {
    position: "absolute",
    top: 60,
    left: 34,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B6B",
    borderWidth: 3,
    borderColor: "#FFA8A8",
    opacity: 0.85,
  },
  planetTwo: {
    position: "absolute",
    top: 95,
    right: 40,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4EA8DE",
    borderWidth: 2,
    borderColor: "#90E0EF",
    opacity: 0.85,
  },
  planetThree: {
    position: "absolute",
    top: 42,
    right: 120,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#9B5DE5",
    opacity: 0.8,
  },
  starField: {
    color: "#FFF3B0",
    fontSize: 16,
    letterSpacing: 3,
    marginBottom: 12,
  },
  heroMascotBadge: {
    alignItems: "center",
    marginBottom: 8,
  },
  heroMascotEmoji: {
    fontSize: 46,
  },
  heroMascotHint: {
    color: "#FFD166",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  gameTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#66FCF1",
    letterSpacing: 2,
  },
  gameSubtitle: {
    fontSize: 13,
    color: "#FFD166",
    letterSpacing: 3,
    marginBottom: 24,
    fontWeight: "700",
  },
  menuButtonList: {
    width: "100%",
    maxWidth: 340,
    gap: 10,
  },
  primaryMenuBtn: {
    backgroundColor: "#66FCF1",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 4,
  },
  primaryMenuBtnText: {
    color: "#070916",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryMenuBtn: {
    backgroundColor: "#161F33",
    borderWidth: 1.5,
    borderColor: "#45A29E",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 4,
  },
  secondaryMenuBtnText: {
    color: "#66FCF1",
    fontSize: 15,
    fontWeight: "bold",
  },
  menuBtnSub: {
    fontSize: 11,
    color: "#8892B0",
    marginTop: 2,
  },
  menuRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  halfBtn: {
    flex: 1,
    backgroundColor: "#161F33",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#293B5F",
  },
  settingsBtn: {
    backgroundColor: "#161F33",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#293B5F",
  },
  halfBtnText: {
    color: "#E6F1FF",
    fontSize: 13,
    fontWeight: "700",
  },
  playContainer: {
    flex: 1,
    backgroundColor: "#070916",
    paddingTop: 44,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  topHud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1B243B",
  },
  hudLabel: {
    color: "#8892B0",
    fontSize: 11,
    fontWeight: "bold",
  },
  hudScore: {
    color: "#66FCF1",
    fontSize: 24,
    fontWeight: "900",
  },
  hudCenter: {
    alignItems: "center",
  },
  hudLevel: {
    color: "#FFD166",
    fontSize: 16,
    fontWeight: "800",
  },
  bannerPill: {
    backgroundColor: "#FFD166",
    color: "#070916",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  pauseBtn: {
    backgroundColor: "#161F33",
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#45A29E",
  },
  pauseBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  middleStage: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    gap: 12,
  },
  boardFrame: {
    backgroundColor: "#0D1326",
    borderWidth: 2,
    borderColor: "#45A29E",
    padding: 3,
    borderRadius: 6,
  },
  boardRow: {
    flexDirection: "row",
  },
  gridCell: {
    borderWidth: 0.5,
    borderColor: "#19233C",
    padding: 1.5,
  },
  cellInner: {
    flex: 1,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  normalGlyph: {
    color: "#070916",
    fontSize: 12,
    fontWeight: "900",
  },
  stoneCell: {
    backgroundColor: "#393E46",
    borderWidth: 2,
    borderColor: "#7F8487",
  },
  stoneGlyph: {
    color: "#D3D6DB",
    fontSize: 13,
    fontWeight: "bold",
  },
  bombCell: {
    backgroundColor: "#FF5722",
    borderWidth: 2,
    borderColor: "#FFCCBC",
  },
  flashCell: {
    backgroundColor: "#00E5FF",
    borderWidth: 2,
    borderColor: "#E0F7FA",
  },
  starCell: {
    backgroundColor: "#FFD600",
    borderWidth: 2,
    borderColor: "#FFF9C4",
  },
  specialGlyph: {
    fontSize: 13,
  },
  sidePanel: {
    width: 112,
    alignItems: "center",
    gap: 10,
  },
  sideTitle: {
    color: "#8892B0",
    fontSize: 11,
    fontWeight: "bold",
  },
  previewBox: {
    backgroundColor: "#0D1326",
    borderWidth: 1.5,
    borderColor: "#293B5F",
    padding: 4,
    borderRadius: 6,
  },
  previewCell: {
    width: 24,
    height: 24,
    borderWidth: 0.5,
    borderColor: "#19233C",
    padding: 1,
  },
  mascotBox: {
    width: "100%",
    backgroundColor: "#10182F",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  mascotName: {
    color: "#E6F1FF",
    fontSize: 12,
    fontWeight: "bold",
  },
  mascotAvatar: {
    fontSize: 36,
    marginVertical: 6,
  },
  mascotExpression: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  statsBox: {
    width: "100%",
    backgroundColor: "#0D1326",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1B243B",
  },
  statLine: {
    color: "#8892B0",
    fontSize: 11,
    fontWeight: "600",
  },
  controlStrip: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  ctrlBtn: {
    backgroundColor: "#161F33",
    borderWidth: 1.5,
    borderColor: "#66FCF1",
    minWidth: 62,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hardDropBtn: {
    borderColor: "#FFD166",
  },
  ctrlBtnText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  ctrlSubLabel: {
    color: "#8892B0",
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 1,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7, 9, 22, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  overlayCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#10182F",
    borderWidth: 2,
    borderColor: "#66FCF1",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  overlayTitle: {
    color: "#FFD166",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  overlayScore: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: "#070916",
  },
  modalContent: {
    padding: 24,
    paddingTop: 56,
    gap: 12,
  },
  sectionHeader: {
    color: "#66FCF1",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: "#10182F",
    borderWidth: 1,
    borderColor: "#293B5F",
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    color: "#FFD166",
    fontSize: 15,
    fontWeight: "bold",
  },
  infoBody: {
    color: "#C5C6C7",
    fontSize: 13,
    lineHeight: 19,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1F2833",
  },
  scoreRank: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  scoreVal: {
    color: "#66FCF1",
    fontWeight: "bold",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#10182F",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#293B5F",
  },
  toggleLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleValue: {
    color: "#66FCF1",
    fontSize: 14,
    fontWeight: "900",
  },
  testLine: {
    color: "#66FCF1",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
