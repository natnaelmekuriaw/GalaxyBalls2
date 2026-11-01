import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Vibration, View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameText as Text } from '@/shared/components/game-text';
import { LANGUAGES } from '@/shared/i18n/translations';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { useAppPreferences } from '@/shared/preferences/AppPreferencesContext';
import { useSnakeSounds } from './audio/useSnakeSounds';
import { SnakeBoard, type SnakeBoardFeedback } from './components/SnakeBoard';
import { FloatingSnakeControls } from './components/FloatingSnakeControls';
import { SnakeControlSettings } from './components/SnakeControlSettings';
import { SnakeOrientationSettings } from './components/SnakeOrientationSettings';
import { SnakeHud } from './components/SnakeHud';
import { SnakeMenu, modeKey } from './components/SnakeMenu';
import { createSnakeCountdown } from './controls/countdown';
import { getDirectionForKey } from './controls/input';
import { getControlHeightBudget, getControlMetrics, type ControlPosition } from './controls/layout';
import { CONTROL_SIZE_LABELS } from './controls/settings';
import { queueControlDirection } from './controls/turnIntent';
import { useSnakeData } from './data/SnakeDataProvider';
import {
  createSnakeGame, getSnakeLevel, getSnakeTickMs, pauseSnake, resumeSnake,
  stepSnake, type Direction, type SnakeState,
} from './engine/snakeEngine';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useSnakeOrientation } from './hooks/useSnakeOrientation';
import { translateSnake, type SnakeTranslationKey } from './i18n/translations';
import { C } from './theme';
import { getSnakePickupReward } from './presentation/reward';

const directionKey: Record<Direction, SnakeTranslationKey> = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right' };
type Feedback = SnakeBoardFeedback;

function Action({ children, onPress, secondary = false }: { children: ReactNode; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => [s.action, secondary && s.secondaryAction, pressed && s.pressed]}>
    <Text style={[s.actionText, secondary && s.secondaryActionText]}>{children}</Text>
  </Pressable>;
}

// Keep the closing card intact until the modal's fade finishes.
const DialogPanel = memo(function DialogPanel({ title, children, footer }: {
  visible: boolean; title: string; children: ReactNode; footer?: ReactNode;
}) {
  return <View accessibilityViewIsModal style={s.dialog}>
    <ScrollView contentContainerStyle={s.dialogContent} bounces={false}>
      <Text accessibilityRole="header" style={s.dialogTitle}>{title}</Text>
      {children}
    </ScrollView>
    {footer && <View style={s.dialogFooter}>{footer}</View>}
  </View>;
}, (_previous, next) => !next.visible);

function Dialog({ visible, title, onClose, children, dismissible = true, footer }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode; dismissible?: boolean; footer?: ReactNode;
}) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View pointerEvents={visible ? 'auto' : 'none'} style={s.backdrop}>
      {dismissible && <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />}
      <DialogPanel visible={visible} title={title} footer={footer}>{children}</DialogPanel>
    </View>
  </Modal>;
}

export default function SnakeScreen() {
  const { language, setLanguage, t: sharedText } = useLanguage();
  const { soundsEnabled, setSoundsEnabled, hapticsEnabled } = useAppPreferences();
  const { currentGame, bestScores, arcadeBestScores, lastDifficulty, lastMode, saveFailed, controls,
    saveGame, finishGame, setDifficulty, setMode: persistMode, setControls, flush } = useSnakeData();
  const isFocused = useIsFocused();
  const focusedRef = useRef(isFocused);
  const focusGeneration = useRef(0);
  const orientation = useSnakeOrientation(isFocused);
  const { play, stop } = useSnakeSounds(soundsEnabled && isFocused);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const compact = height < 650;
  const compactControls = width < 600 || compact;
  const [game, setGame] = useState(() => currentGame ?? createSnakeGame(lastDifficulty, Date.now(), lastMode));
  const stateRef = useRef(game);
  const [inGame, setInGame] = useState(false);
  const inGameRef = useRef(false);
  const [pace, setPace] = useState(lastDifficulty);
  const [mode, setMode] = useState(lastMode);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownClock] = useState(() => createSnakeCountdown());
  const countdownActive = useRef(false);
  const [pendingNew, setPendingNew] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const resumeAfterTools = useRef(false);
  const [orientationOpen, setOrientationOpen] = useState(false);
  const [arranging, setArranging] = useState(false);
  const arrangingRef = useRef(false);
  const previewOnly = useRef(false);
  const [controlGeneration, setControlGeneration] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [arena, setArena] = useState({ width: 0, height: 0 });
  const [playBounds, setPlayBounds] = useState({ width: 0, height: 0 });
  const [recordBeforeRun, setRecordBeforeRun] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | undefined>();
  const [levelFeedback, setLevelFeedback] = useState<Feedback | undefined>();
  const feedbackId = useRef(0);
  const tr = (key: SnakeTranslationKey, values?: Record<string, string | number>) => translateSnake(language, key, values);
  const terminal = game.status === 'GAME_OVER' || game.status === 'WON';
  const boardSize = Math.max(0, Math.floor(Math.min(arena.width - 8, arena.height - 8, 560)));
  const gameBest = (game.mode === 'ARCADE' ? arcadeBestScores : bestScores)[game.difficulty];
  const menuBest = (mode === 'ARCADE' ? arcadeBestScores : bestScores)[pace];
  const foods = game.body.length - 4;
  const controlMetrics = getControlMetrics(controls, compactControls, getControlHeightBudget(playBounds, compactControls, landscape));
  const controlSummary = tr('controlSummary', { style: tr(controls.style === 'ANALOG' ? 'analog' : 'buttons'), size: tr(CONTROL_SIZE_LABELS[controls.size]) });

  const apply = useCallback((next: SnakeState) => {
    stateRef.current = next;
    setGame(next);
    if (next.status === 'GAME_OVER' || next.status === 'WON') finishGame(next);
    else saveGame(next);
  }, [saveGame, finishGame]);

  const pause = useCallback(() => {
    countdownClock.cancel();
    setFeedback(undefined);
    setLevelFeedback(undefined);
    countdownActive.current = false;
    setCountdown(null);
    setControlGeneration(value => value + 1);
    if (inGameRef.current) apply(pauseSnake(stateRef.current));
    stop();
    void flush();
  }, [apply, flush, stop, countdownClock]);

  const previousLandscape = useRef(landscape);
  useEffect(() => {
    if (previousLandscape.current === landscape) return;
    previousLandscape.current = landscape;
    pause();
    setToolsOpen(false);
  }, [landscape, pause]);

  const beginCountdown = useCallback((snapshot: SnakeState) => {
    if (AppState.currentState !== null && AppState.currentState !== 'active') return;
    inGameRef.current = true;
    previewOnly.current = false;
    arrangingRef.current = false;
    setArranging(false);
    setToolsOpen(false);
    setOrientationOpen(false);
    setControls({ locked: true });
    setInGame(true);
    setPace(snapshot.difficulty);
    setMode(snapshot.mode);
    setFeedback(undefined);
    setLevelFeedback(undefined);
    apply(pauseSnake(snapshot));
    countdownActive.current = true;
    countdownClock.start(setCountdown, () => {
      countdownActive.current = false;
      setCountdown(null);
      apply(resumeSnake(stateRef.current));
    });
    play('start');
  }, [apply, play, countdownClock, setControls]);

  const turn = useCallback((direction: Direction) => {
    const previous = stateRef.current;
    if (arrangingRef.current) return;
    const next = queueControlDirection(previous, direction, countdownActive.current);
    if (next !== previous) {
      stateRef.current = next;
      setGame(next);
      // The next tick or pause checkpoints accepted input without a storage write per tap.
      play('turn');
    }
  }, [play]);

  const updateControlPosition = useCallback((position: ControlPosition) => setControls({ position }), [setControls]);
  const finishArranging = useCallback(() => {
    arrangingRef.current = false;
    setArranging(false);
    setControls({ locked: true });
    setControlGeneration(value => value + 1);
    if (previewOnly.current) {
      previewOnly.current = false;
      inGameRef.current = false;
      setInGame(false);
    }
  }, [setControls]);
  const openControls = () => { pause(); setToolsOpen(false); setControlsOpen(true); };
  const closeTools = () => {
    setToolsOpen(false);
    if (resumeAfterTools.current) {
      resumeAfterTools.current = false;
      beginCountdown(stateRef.current);
    }
  };
  const rotateGame = async () => {
    pause();
    setToolsOpen(false);
    const generation = focusGeneration.current;
    const changed = await orientation.changeOrientation(landscape ? 'PORTRAIT' : 'LANDSCAPE');
    if (!changed && focusedRef.current && generation === focusGeneration.current) setOrientationOpen(true);
  };
  const arrangeControls = () => {
    pause();
    setToolsOpen(false);
    if (!inGameRef.current) {
      previewOnly.current = true;
      const snapshot = currentGame ?? createSnakeGame(pace, Date.now(), mode);
      stateRef.current = snapshot;
      setGame(snapshot);
      setInGame(true);
    }
    arrangingRef.current = true;
    setArranging(true);
    setControls({ locked: false });
    setControlsOpen(false);
  };

  const returnToMenu = () => {
    pause();
    setToolsOpen(false);
    inGameRef.current = false;
    previewOnly.current = false;
    arrangingRef.current = false;
    setArranging(false);
    setInGame(false);
    setPace(stateRef.current.difficulty);
    setMode(stateRef.current.mode);
  };
  const leave = () => {
    pause();
    if (router.canGoBack()) router.back();
    else router.replace('/explore');
  };
  const startFresh = () => {
    setPendingNew(false);
    setRecordBeforeRun(menuBest);
    setDifficulty(pace);
    persistMode(mode);
    beginCountdown(createSnakeGame(pace, Date.now(), mode));
  };
  const resumeSaved = () => {
    if (!currentGame) return;
    setRecordBeforeRun((currentGame.mode === 'ARCADE' ? arcadeBestScores : bestScores)[currentGame.difficulty]);
    beginCountdown(currentGame);
  };
  const requestNew = () => { if (currentGame) setPendingNew(true); else startFresh(); };

  const tickMs = getSnakeTickMs(game);
  useEffect(() => {
    if (!inGame || !isFocused || game.status !== 'PLAYING') return;
    const timer = setInterval(() => {
      const previous = stateRef.current;
      const next = stepSnake(previous);
      if (next === previous) return;
      apply(next);
      const reward = getSnakePickupReward(previous, next);
      if (next.status === 'GAME_OVER' || next.status === 'WON') {
        stop();
        play(next.status === 'WON' ? 'win' : 'lose');
        reward?.sounds.forEach(cue => play(cue));
        if (hapticsEnabled && Platform.OS !== 'web') Vibration.vibrate(next.status === 'WON' ? 70 : 120);
      } else if (reward) {
        const pickup = { id: ++feedbackId.current, kind: reward.kind, points: reward.points, position: reward.position };
        setFeedback(pickup);
        if (reward.kind === 'level') setLevelFeedback(pickup);
        reward.sounds.forEach(cue => play(cue));
        if (hapticsEnabled && Platform.OS !== 'web') Vibration.vibrate(reward.kind === 'food' ? 12 : 35);
      }
    }, tickMs);
    return () => clearInterval(timer);
  }, [inGame, isFocused, game.status, tickMs, apply, play, stop, hapticsEnabled]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(undefined), 1100);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!levelFeedback) return;
    const timer = setTimeout(() => setLevelFeedback(undefined), 1400);
    return () => clearTimeout(timer);
  }, [levelFeedback]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    focusGeneration.current++;
    return () => {
      focusedRef.current = false;
      focusGeneration.current++;
      setToolsOpen(false);
      setOrientationOpen(false);
      pause();
    };
  }, [pause]));
  useEffect(() => {
    const change = AppState.addEventListener('change', next => { if (next !== 'active') pause(); });
    const blur = Platform.OS === 'android' ? AppState.addEventListener('blur', pause) : null;
    const hidden = () => { if (document.hidden) pause(); };
    if (Platform.OS === 'web') {
      window.addEventListener('blur', pause);
      window.addEventListener('pagehide', pause);
      document.addEventListener('visibilitychange', hidden);
    }
    return () => {
      countdownClock.cancel();
      countdownActive.current = false;
      change.remove();
      blur?.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('blur', pause);
        window.removeEventListener('pagehide', pause);
        document.removeEventListener('visibilitychange', hidden);
      }
    };
  }, [pause, countdownClock]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !inGame || !isFocused || languageOpen || pendingNew || controlsOpen || toolsOpen || orientationOpen) return;
    const keydown = (event: KeyboardEvent) => {
      if (!inGameRef.current && !arrangingRef.current) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const direction = getDirectionForKey(event.key);
      if (arrangingRef.current) {
        if (direction) {
          event.preventDefault();
          updateControlPosition({
            x: Math.max(0, Math.min(1, controls.position.x + (direction === 'RIGHT' ? 0.05 : direction === 'LEFT' ? -0.05 : 0))),
            y: Math.max(0, Math.min(1, controls.position.y + (direction === 'DOWN' ? 0.05 : direction === 'UP' ? -0.05 : 0))),
          });
        } else if (event.key === 'Escape') { event.preventDefault(); finishArranging(); }
        return;
      }
      if (direction) {
        event.preventDefault();
        if (!event.repeat) turn(direction);
      } else if (event.key === ' ' || event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        if (event.repeat || stateRef.current.status === 'GAME_OVER' || stateRef.current.status === 'WON') return;
        if (event.key === ' ' && stateRef.current.status === 'PAUSED' && countdown === null
          && event.target instanceof HTMLElement && event.target.closest('button, [role="button"]')) return;
        event.preventDefault();
        if (stateRef.current.status === 'PLAYING' || countdown !== null) pause();
        else if (event.key !== 'Escape') beginCountdown(stateRef.current);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [inGame, isFocused, languageOpen, pendingNew, controlsOpen, toolsOpen, orientationOpen, countdown, turn, pause, beginCountdown,
    controls.position.x, controls.position.y, finishArranging, updateControlPosition]);

  const showRunDialog = inGame && !arranging && !controlsOpen && !toolsOpen && !orientationOpen && countdown === null && game.status !== 'PLAYING' && !languageOpen && isFocused;
  const outcomeKey = game.status === 'WON' ? 'won' : terminal ? 'gameOver' : 'paused';
  const deathKey = game.deathReason === 'rock' ? 'rockHit' : game.deathReason === 'body' ? 'bodyHit' : 'wallHit';
  const runActions = showRunDialog ? <>
    <Action onPress={() => terminal ? startFresh() : beginCountdown(stateRef.current)}>{tr(terminal ? 'playAgain' : 'continue')} ↗</Action>
    <Action secondary onPress={returnToMenu}>{tr('menu')}</Action>
    <View style={s.dialogTools}>
      <Pressable accessibilityRole="button" onPress={openControls} style={s.dialogTool}><Text style={s.dialogLanguageText}>⚙ {tr('controls')}</Text></Pressable>
      {!terminal && <Pressable accessibilityRole="button" onPress={() => setLanguageOpen(true)} style={s.dialogTool}>
        <Text style={s.dialogLanguageText}>{sharedText('language')} · {language === 'am' ? 'አማ' : language.toUpperCase()} ›</Text>
      </Pressable>}
    </View>
  </> : undefined;

  return <View testID="snake-screen" style={[s.screen, {
    paddingTop: insets.top + 5, paddingBottom: insets.bottom + 6,
    paddingLeft: insets.left + 14, paddingRight: insets.right + 14,
  }]}>
    <View style={s.header}>
      {!inGame && <Pressable accessibilityRole="button" accessibilityLabel={tr('backToGames')} onPress={leave} style={s.iconButton}>
        <Text style={s.backIcon}>‹</Text>
      </Pressable>}
      {inGame ? <View style={s.headerHud}><SnakeHud game={game} best={gameBest} compact={compact || width < 600} tr={tr} /></View>
        : <View style={s.brand}><View style={s.brandSeed} /><Text style={s.brandText}>{tr('title')}</Text></View>}
      {(!inGame || arranging) && <Pressable accessibilityRole="button" accessibilityLabel={arranging ? tr('resetPosition') : `${sharedText('language')}: ${LANGUAGES.find(item => item.code === language)?.label}`}
        onPress={() => { if (arranging) updateControlPosition({ x: 1, y: 1 }); else { pause(); setLanguageOpen(true); } }} style={s.iconButton}>
        <Text style={[s.languageCode, arranging && { fontSize: 23 }]}>{arranging ? '↺' : language === 'am' ? 'አማ' : language.toUpperCase()}</Text>
      </Pressable>}
      {!inGame && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: soundsEnabled }} accessibilityLabel={tr(soundsEnabled ? 'soundOn' : 'soundOff')}
        onPress={() => setSoundsEnabled(!soundsEnabled)} style={s.iconButton}>
        <Text style={[s.soundIcon, !soundsEnabled && { color: C.muted }]}>{soundsEnabled ? '♫' : '♪'}</Text>
      </Pressable>}
      {inGame && !arranging && <Pressable accessibilityRole="button" accessibilityLabel={tr(toolsOpen ? 'hideTools' : 'showTools')}
        accessibilityState={{ expanded: toolsOpen }} onPress={() => {
          if (toolsOpen) closeTools();
          else {
            resumeAfterTools.current = stateRef.current.status === 'PLAYING' || countdownActive.current;
            pause();
            setToolsOpen(true);
          }
        }} style={[s.iconButton, toolsOpen && s.toolsActive]}>
        <Text style={s.toolsGlyph}>{toolsOpen ? '×' : '☰'}</Text>
      </Pressable>}
      {inGame && (!terminal || arranging) && <Pressable accessibilityRole="button" accessibilityLabel={tr(arranging ? 'finishEditing' : game.status === 'PLAYING' || countdown !== null ? 'pause' : 'continue')}
        onPress={() => arranging ? finishArranging() : game.status === 'PLAYING' || countdown !== null ? pause() : beginCountdown(stateRef.current)} style={[s.iconButton, s.pauseButton]}>
        <Text style={s.pauseIcon}>{arranging ? '✓' : game.status === 'PLAYING' || countdown !== null ? 'Ⅱ' : '▶'}</Text>
      </Pressable>}
    </View>

    {!inGame ? <SnakeMenu mode={mode} pace={pace} best={menuBest} currentGame={currentGame} compact={compact}
      reducedMotion={reducedMotion} tr={tr} rulesOpen={rulesOpen}
      onMode={value => { setMode(value); persistMode(value); }} onPace={value => { setPace(value); setDifficulty(value); }}
      onResume={resumeSaved} onNew={requestNew} onRules={() => setRulesOpen(!rulesOpen)} onControls={openControls} controlSummary={controlSummary} /> : <>
      <View style={s.playArea} onLayout={event => {
        const { width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout;
        setPlayBounds(previous => previous.width === measuredWidth && previous.height === measuredHeight ? previous : { width: measuredWidth, height: measuredHeight });
      }}>
        <View style={[s.arena, { position: 'absolute', top: 0,
          left: landscape && controls.position.x < 0.5 ? controlMetrics.width + 24 : 0,
          right: landscape && controls.position.x >= 0.5 ? controlMetrics.width + 24 : 0,
          height: Math.max(0, landscape ? playBounds.height : playBounds.height - controlMetrics.padHeight - 12) }]} onLayout={event => {
          const { width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout;
          setArena(previous => previous.width === measuredWidth && previous.height === measuredHeight ? previous : { width: measuredWidth, height: measuredHeight });
        }}>
          {boardSize > 0 && <SnakeBoard state={game} size={boardSize} enabled={!arranging && (game.status === 'PLAYING' || countdown !== null) && isFocused}
            onDirection={turn} reducedMotion={reducedMotion} feedback={feedback} levelFeedback={levelFeedback}
            label={tr('boardLabel', { mode: tr(modeKey[game.mode]), score: game.score, foods, level: getSnakeLevel(game) })}>
            {countdown !== null && <View pointerEvents="none" style={s.countdownOverlay}>
              <Text style={s.ready}>{tr('ready')}</Text>
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.countdown}>{countdown}</Text>
            </View>}
          </SnakeBoard>}
          {(levelFeedback || feedback) && game.status === 'PLAYING' && <View pointerEvents="none" style={[s.feedback, !!levelFeedback && s.levelFeedback]}>
            <Text accessibilityLiveRegion="polite" style={[s.feedbackText, !levelFeedback && feedback?.kind === 'bonus' && { color: C.gold }]}>
              {levelFeedback ? `✦ ${tr('levelUp', { level: getSnakeLevel(game) })}` : tr('bonusPoints', { points: feedback?.points ?? 0 })}
            </Text>
          </View>}
        </View>
        {playBounds.width > 0 && playBounds.height > 0 && <FloatingSnakeControls
          key={`${controls.style}-${controls.size}-${controls.locked}-${controlGeneration}`}
          settings={controls} bounds={playBounds} compact={compactControls} landscape={landscape} editing={arranging && isFocused}
          enabled={!arranging && (game.status === 'PLAYING' || countdown !== null) && isFocused}
          onDirection={turn} label={direction => tr(directionKey[direction])} onPositionChange={updateControlPosition}
          onLock={finishArranging} moveLabel={tr('dragControls')} lockLabel={tr('finishEditing')} />}
      </View>
      {arranging && !compact && <Text style={s.gameHint}>{tr('dragControls')}</Text>}
    </>}
    {saveFailed && <Text accessibilityRole="alert" style={s.saveError}>{tr('saveFailed')}</Text>}

    {inGame && toolsOpen && !arranging && <View testID="snake-tools-panel" style={[s.toolsLayer, { top: insets.top + (compact || width < 600 ? 57 : 67) }]} pointerEvents="box-none">
      <Pressable accessible={false} onPress={closeTools} style={s.toolsBackdrop} />
      <ScrollView style={[s.toolsPanel, { right: insets.right + 14, maxHeight: Math.max(120, height - insets.top - insets.bottom - 82) }]}
        contentContainerStyle={s.toolsContent} bounces={false}>
        <Text style={s.toolsTitle}>{tr('tools')}</Text>
        <Pressable accessibilityRole="button" onPress={returnToMenu} style={s.toolRow}><Text style={s.toolIcon}>‹</Text><Text style={s.toolLabel}>{tr('menu')}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={openControls} style={s.toolRow}><Text style={s.toolIcon}>⚙</Text><Text style={s.toolLabel}>{tr('customizeControls')}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={arrangeControls} style={s.toolRow}><Text style={s.toolIcon}>✥</Text><Text style={s.toolLabel}>{tr('moveControls')}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={orientation.busy} onPress={() => { void rotateGame(); }} style={s.toolRow}><Text style={s.toolIcon}>↻</Text><Text style={s.toolLabel}>{tr('rotateScreen')} · {tr(landscape ? 'portrait' : 'landscape')}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setToolsOpen(false); setLanguageOpen(true); }} style={s.toolRow}><Text style={s.toolIcon}>{language === 'am' ? 'አማ' : language.toUpperCase()}</Text><Text style={s.toolLabel}>{sharedText('language')}</Text></Pressable>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: soundsEnabled }} accessibilityLabel={tr(soundsEnabled ? 'soundOn' : 'soundOff')}
          onPress={() => setSoundsEnabled(!soundsEnabled)} style={s.toolRow}><Text style={s.toolIcon}>{soundsEnabled ? '♫' : '♪'}</Text><Text style={s.toolLabel}>{tr(soundsEnabled ? 'soundOn' : 'soundOff')}</Text></Pressable>
      </ScrollView>
    </View>}

    <Dialog visible={showRunDialog || pendingNew || languageOpen || controlsOpen || orientationOpen}
      title={languageOpen ? sharedText('language') : controlsOpen ? tr('customizeControls') : orientationOpen ? tr('screenOrientation') : pendingNew ? tr('replaceTitle') : tr(outcomeKey)}
      onClose={() => languageOpen ? setLanguageOpen(false) : controlsOpen ? setControlsOpen(false) : orientationOpen ? setOrientationOpen(false) : pendingNew ? setPendingNew(false) : returnToMenu()}
      dismissible={languageOpen || pendingNew || controlsOpen || orientationOpen}
      footer={controlsOpen || orientationOpen ? <Action secondary onPress={() => { setControlsOpen(false); setOrientationOpen(false); }}>{tr('done')}</Action> : !languageOpen && !pendingNew ? runActions : undefined}>
      {languageOpen ? <>
        {LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }}
          onPress={() => { setLanguage(item.code); setLanguageOpen(false); }} style={[s.languageOption, language === item.code && s.languageSelected]}>
          <Text style={s.languageText}>{language === item.code ? '●' : '○'} {item.label}</Text>
        </Pressable>)}
        <Action secondary onPress={() => setLanguageOpen(false)}>{tr('cancel')}</Action>
      </> : controlsOpen || orientationOpen ? <>
        {controlsOpen && <SnakeControlSettings settings={controls} onChange={setControls} onArrange={arrangeControls} tr={tr} />}
        <SnakeOrientationSettings requested={orientation.requested} busy={orientation.busy} unavailable={orientation.unavailable}
          web={Platform.OS === 'web'} onChange={choice => { pause(); void orientation.changeOrientation(choice); }} tr={tr} />
      </> : pendingNew ? <>
        <Text style={s.dialogBody}>{tr('replaceMessage')}</Text>
        <Action onPress={startFresh}>{tr('replaceAndStart')}</Action>
        <Action secondary onPress={() => setPendingNew(false)}>{tr('cancel')}</Action>
      </> : <>
      {!compact && <View style={s.resultEmblem}><Text style={[s.resultGlyph, game.status === 'GAME_OVER' && { color: C.coral }]}>{terminal ? game.status === 'WON' ? '✦' : '↻' : 'Ⅱ'}</Text></View>}
      <Text style={s.resultHint}>{tr(terminal ? game.status === 'WON' ? 'runComplete' : deathKey : 'pausedHint')}</Text>
      <View style={s.resultScoreRow}><Text style={s.resultScore}>{game.score.toLocaleString()}</Text><Text style={s.resultScoreLabel}>{tr('score')}</Text></View>
      {terminal && game.score > recordBeforeRun && <Text style={s.newBest}>★ {tr('newBest')}</Text>}
      <View style={s.resultStats}>
        {[{ label: tr('fruitCollected'), value: foods }, { label: tr('level'), value: getSnakeLevel(game) },
          { label: tr(game.mode === 'ARCADE' ? 'bestChain' : 'length'), value: game.mode === 'ARCADE' ? game.bestCombo ? `${game.bestCombo}×` : '—' : game.body.length }].map(item =>
          <View key={item.label} style={s.resultStat}><Text style={s.resultStatValue}>{item.value}</Text><Text style={s.resultStatLabel}>{item.label}</Text></View>)}
      </View>
      </>}
    </Dialog>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, marginBottom: 4, maxWidth: 1000, width: '100%', alignSelf: 'center' },
  headerHud: { flex: 1, minWidth: 0, paddingRight: 4 },
  iconButton: { minWidth: 44, height: 44, borderRadius: 15, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  backIcon: { color: C.cream, fontSize: 32, lineHeight: 36 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandSeed: { width: 7, height: 11, borderRadius: 4, backgroundColor: C.mint, transform: [{ rotate: '28deg' }] },
  brandText: { color: C.cream, fontSize: 19, fontWeight: '900', flexShrink: 1 },
  languageCode: { color: C.cream, fontSize: 11, fontWeight: '800' },
  soundIcon: { color: C.mint, fontSize: 23, fontWeight: '700' },
  pauseButton: { backgroundColor: C.mint, borderColor: C.mint },
  pauseIcon: { color: C.bg, fontSize: 19, fontWeight: '900' },
  playArea: { flex: 1, width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 8 },
  arena: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0, minWidth: 0 },
  toolsActive: { borderColor: C.teal },
  toolsGlyph: { color: C.cream, fontSize: 24, fontWeight: '700' },
  toolsLayer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20 },
  toolsBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#02101166' },
  toolsPanel: { position: 'absolute', top: 0, width: 248, backgroundColor: C.panel, borderWidth: 1, borderColor: '#3C5D48', borderRadius: 18 },
  toolsContent: { padding: 8, gap: 2 },
  toolsTitle: { color: C.muted, fontSize: 11, fontWeight: '800', padding: 8 },
  toolRow: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12 },
  toolIcon: { color: C.teal, fontSize: 20, width: 28, textAlign: 'center' },
  toolLabel: { flex: 1, color: C.cream, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  gameHint: { color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  countdownOverlay: { ...StyleSheet.absoluteFill, backgroundColor: '#071B1C70', alignItems: 'center', justifyContent: 'center' },
  ready: { color: C.cream, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  countdown: { fontSize: 80, color: C.mint, fontWeight: '900' },
  feedback: { position: 'absolute', top: 8, right: 12, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: C.panelRaised, borderRadius: 12, borderWidth: 1, borderColor: C.line },
  levelFeedback: { backgroundColor: '#244638', borderColor: '#8FCE8A' },
  feedbackText: { color: C.mint, fontSize: 16, fontWeight: '900' },
  saveError: { color: '#FDA4AF', fontSize: 12, lineHeight: 18, paddingVertical: 5 },
  backdrop: { flex: 1, backgroundColor: '#021011DD', alignItems: 'center', justifyContent: 'center', padding: 22 },
  dialog: { width: '100%', maxWidth: 400, maxHeight: '90%', borderRadius: 28, backgroundColor: C.panel, borderColor: '#3C5D48', borderWidth: 1, overflow: 'hidden' },
  dialogContent: { padding: 24, gap: 14 },
  dialogFooter: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 8, gap: 10, borderTopWidth: 1, borderTopColor: C.line },
  dialogTitle: { color: C.cream, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  dialogBody: { color: C.muted, fontSize: 14, lineHeight: 23 },
  resultEmblem: { width: 58, height: 58, borderRadius: 20, backgroundColor: C.panelRaised, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  resultGlyph: { color: C.mint, fontSize: 35, fontWeight: '700' },
  resultHint: { color: C.muted, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  resultScoreRow: { alignItems: 'center', gap: 2 },
  resultScore: { color: C.cream, fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] },
  resultScoreLabel: { color: C.muted, fontSize: 11 },
  newBest: { color: C.gold, textAlign: 'center', fontSize: 12, fontWeight: '800' },
  resultStats: { flexDirection: 'row', gap: 6, marginVertical: 2 },
  resultStat: { flex: 1, alignItems: 'center', backgroundColor: C.panelRaised, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4, gap: 5 },
  resultStatValue: { color: C.teal, fontSize: 20, fontWeight: '800' },
  resultStatLabel: { color: C.muted, fontSize: 9, lineHeight: 14, textAlign: 'center' },
  action: { backgroundColor: C.mint, borderRadius: 16, minHeight: 52, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: C.bg, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  secondaryAction: { backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.line },
  secondaryActionText: { color: C.cream },
  pressed: { opacity: 0.76 },
  dialogLanguageText: { color: C.muted, fontSize: 12, textAlign: 'center' },
  dialogTools: { flexDirection: 'row', gap: 8 },
  dialogTool: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 6, backgroundColor: C.panelRaised, borderRadius: 12 },
  languageOption: { minHeight: 52, padding: 14, borderRadius: 14, backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.line },
  languageSelected: { borderColor: C.mint },
  languageText: { color: C.cream, fontSize: 16, fontWeight: '700' },
});
