import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
import { SnakeBoard } from './components/SnakeBoard';
import { SnakeControls } from './components/SnakeControls';
import { SnakeHud } from './components/SnakeHud';
import { SnakeMenu, modeKey, paceKey } from './components/SnakeMenu';
import { createSnakeCountdown } from './controls/countdown';
import { getDirectionForKey } from './controls/input';
import { useSnakeData } from './data/SnakeDataProvider';
import {
  createSnakeGame, getSnakeLevel, getSnakeTickMs, pauseSnake, queueDirection, resumeSnake,
  stepSnake, type Direction, type SnakeState,
} from './engine/snakeEngine';
import { useReducedMotion } from './hooks/useReducedMotion';
import { translateSnake, type SnakeTranslationKey } from './i18n/translations';
import { C } from './theme';

const directionKey: Record<Direction, SnakeTranslationKey> = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right' };
type Feedback = { id: number; kind: 'food' | 'bonus' | 'level'; points: number };

function Action({ children, onPress, secondary = false }: { children: ReactNode; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => [s.action, secondary && s.secondaryAction, pressed && s.pressed]}>
    <Text style={[s.actionText, secondary && s.secondaryActionText]}>{children}</Text>
  </Pressable>;
}

function Dialog({ visible, title, onClose, children, dismissible = true, footer }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode; dismissible?: boolean; footer?: ReactNode;
}) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}>
      {dismissible && <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />}
      <View accessibilityViewIsModal style={s.dialog}>
        <ScrollView contentContainerStyle={s.dialogContent} bounces={false}>
          <Text accessibilityRole="header" style={s.dialogTitle}>{title}</Text>
          {children}
        </ScrollView>
        {footer && <View style={s.dialogFooter}>{footer}</View>}
      </View>
    </View>
  </Modal>;
}

export default function SnakeScreen() {
  const { language, setLanguage, t: sharedText } = useLanguage();
  const { soundsEnabled, setSoundsEnabled, hapticsEnabled } = useAppPreferences();
  const { currentGame, bestScores, arcadeBestScores, lastDifficulty, lastMode, saveFailed,
    saveGame, finishGame, setDifficulty, setMode: persistMode, flush } = useSnakeData();
  const isFocused = useIsFocused();
  const { play, stop } = useSnakeSounds(soundsEnabled && isFocused);
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height && height < 650;
  const compact = height < 650;
  const [game, setGame] = useState(() => currentGame ?? createSnakeGame(lastDifficulty, Date.now(), lastMode));
  const stateRef = useRef(game);
  const [inGame, setInGame] = useState(false);
  const inGameRef = useRef(false);
  const [pace, setPace] = useState(lastDifficulty);
  const [mode, setMode] = useState(lastMode);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownClock] = useState(() => createSnakeCountdown());
  const [pendingNew, setPendingNew] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [arena, setArena] = useState({ width: 0, height: 0 });
  const [recordBeforeRun, setRecordBeforeRun] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | undefined>();
  const feedbackId = useRef(0);
  const tr = (key: SnakeTranslationKey, values?: Record<string, string | number>) => translateSnake(language, key, values);
  const terminal = game.status === 'GAME_OVER' || game.status === 'WON';
  const boardSize = Math.max(0, Math.floor(Math.min(arena.width - 8, arena.height - 8, 560)));
  const gameBest = (game.mode === 'ARCADE' ? arcadeBestScores : bestScores)[game.difficulty];
  const menuBest = (mode === 'ARCADE' ? arcadeBestScores : bestScores)[pace];
  const foods = game.body.length - 4;

  const apply = useCallback((next: SnakeState) => {
    stateRef.current = next;
    setGame(next);
    if (next.status === 'GAME_OVER' || next.status === 'WON') finishGame(next);
    else saveGame(next);
  }, [saveGame, finishGame]);

  const pause = useCallback(() => {
    countdownClock.cancel();
    setCountdown(null);
    if (inGameRef.current) apply(pauseSnake(stateRef.current));
    stop();
    void flush();
  }, [apply, flush, stop, countdownClock]);

  const beginCountdown = useCallback((snapshot: SnakeState) => {
    if (AppState.currentState !== null && AppState.currentState !== 'active') return;
    inGameRef.current = true;
    setInGame(true);
    setPace(snapshot.difficulty);
    setMode(snapshot.mode);
    setFeedback(undefined);
    apply(pauseSnake(snapshot));
    countdownClock.start(setCountdown, () => {
      setCountdown(null);
      apply(resumeSnake(stateRef.current));
    });
    play('start');
  }, [apply, play, countdownClock]);

  const turn = useCallback((direction: Direction) => {
    const previous = stateRef.current;
    const next = queueDirection(previous, direction);
    if (next !== previous) { apply(next); play('turn'); }
  }, [apply, play]);

  const returnToMenu = () => {
    pause();
    inGameRef.current = false;
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
      if (next.status === 'GAME_OVER' || next.status === 'WON') {
        stop();
        play(next.status === 'WON' ? 'win' : 'lose');
        if (hapticsEnabled && Platform.OS !== 'web') Vibration.vibrate(next.status === 'WON' ? 70 : 120);
      } else if (next.score > previous.score) {
        const bonus = next.bonusCollected > previous.bonusCollected;
        const level = getSnakeLevel(next) > getSnakeLevel(previous);
        setFeedback({ id: ++feedbackId.current, kind: bonus ? 'bonus' : level ? 'level' : 'food', points: next.score - previous.score });
        play(bonus ? 'bonus' : level ? 'level' : 'eat');
        if (hapticsEnabled && Platform.OS !== 'web') Vibration.vibrate(bonus ? 35 : 12);
      }
    }, tickMs);
    return () => clearInterval(timer);
  }, [inGame, isFocused, game.status, tickMs, apply, play, stop, hapticsEnabled]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(undefined), 1100);
    return () => clearTimeout(timer);
  }, [feedback]);

  useFocusEffect(useCallback(() => () => pause(), [pause]));
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
    if (Platform.OS !== 'web' || !inGame || !isFocused || languageOpen || pendingNew) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const direction = getDirectionForKey(event.key);
      if (direction) {
        event.preventDefault();
        if (!event.repeat) turn(direction);
      } else if (event.key === ' ' || event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        if (event.repeat || stateRef.current.status === 'GAME_OVER' || stateRef.current.status === 'WON') return;
        event.preventDefault();
        if (stateRef.current.status === 'PLAYING' || countdown !== null) pause();
        else if (event.key !== 'Escape') beginCountdown(stateRef.current);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [inGame, isFocused, languageOpen, pendingNew, countdown, turn, pause, beginCountdown]);

  const showRunDialog = inGame && countdown === null && game.status !== 'PLAYING' && !languageOpen && isFocused;
  const outcomeKey = game.status === 'WON' ? 'won' : terminal ? 'gameOver' : 'paused';
  const deathKey = game.deathReason === 'rock' ? 'rockHit' : game.deathReason === 'body' ? 'bodyHit' : 'wallHit';
  const runActions = showRunDialog ? <>
    <Action onPress={() => terminal ? startFresh() : beginCountdown(stateRef.current)}>{tr(terminal ? 'playAgain' : 'continue')} ↗</Action>
    <Action secondary onPress={returnToMenu}>{tr('menu')}</Action>
    {!terminal && <Pressable accessibilityRole="button" onPress={() => setLanguageOpen(true)} style={s.dialogLanguage}>
      <Text style={s.dialogLanguageText}>{sharedText('language')} · {LANGUAGES.find(item => item.code === language)?.label} ›</Text>
    </Pressable>}
  </> : undefined;

  return <View testID="snake-screen" style={[s.screen, {
    paddingTop: insets.top + 5, paddingBottom: insets.bottom + 6,
    paddingLeft: insets.left + 14, paddingRight: insets.right + 14,
  }]}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('backToGames')} onPress={leave} style={s.iconButton}>
        <Text style={s.backIcon}>‹</Text>
      </Pressable>
      <View style={s.brand}><View style={s.brandSeed} /><Text style={s.brandText}>{tr('title')}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${sharedText('language')}: ${LANGUAGES.find(item => item.code === language)?.label}`}
        onPress={() => { pause(); setLanguageOpen(true); }} style={s.iconButton}>
        <Text style={s.languageCode}>{language === 'am' ? 'አማ' : language.toUpperCase()}</Text>
      </Pressable>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: soundsEnabled }} accessibilityLabel={tr(soundsEnabled ? 'soundOn' : 'soundOff')}
        onPress={() => setSoundsEnabled(!soundsEnabled)} style={s.iconButton}>
        <Text style={[s.soundIcon, !soundsEnabled && { color: C.muted }]}>{soundsEnabled ? '♫' : '♪'}</Text>
      </Pressable>
      {inGame && !terminal && <Pressable accessibilityRole="button" accessibilityLabel={tr(game.status === 'PLAYING' || countdown !== null ? 'pause' : 'continue')}
        onPress={() => game.status === 'PLAYING' || countdown !== null ? pause() : beginCountdown(stateRef.current)} style={[s.iconButton, s.pauseButton]}>
        <Text style={s.pauseIcon}>{game.status === 'PLAYING' || countdown !== null ? 'Ⅱ' : '▶'}</Text>
      </Pressable>}
    </View>

    {!inGame ? <SnakeMenu mode={mode} pace={pace} best={menuBest} currentGame={currentGame} compact={compact}
      reducedMotion={reducedMotion} tr={tr} rulesOpen={rulesOpen}
      onMode={value => { setMode(value); persistMode(value); }} onPace={value => { setPace(value); setDifficulty(value); }}
      onResume={resumeSaved} onNew={requestNew} onRules={() => setRulesOpen(!rulesOpen)} /> : <>
      <SnakeHud game={game} best={gameBest} compact={compact} tr={tr} />
      <View style={[s.playArea, landscape && s.landscape]}>
        <View style={s.arena} onLayout={event => {
          const { width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout;
          setArena(previous => previous.width === measuredWidth && previous.height === measuredHeight ? previous : { width: measuredWidth, height: measuredHeight });
        }}>
          {boardSize > 0 && <SnakeBoard state={game} size={boardSize} enabled={game.status === 'PLAYING' && countdown === null}
            onDirection={turn} reducedMotion={reducedMotion} feedback={feedback}
            label={tr('boardLabel', { mode: tr(modeKey[game.mode]), score: game.score, foods, level: getSnakeLevel(game) })}>
            {countdown !== null && <View style={s.countdownOverlay}>
              <Text style={s.ready}>{tr('ready')}</Text>
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.countdown}>{countdown}</Text>
            </View>}
          </SnakeBoard>}
          {feedback && game.status === 'PLAYING' && <View pointerEvents="none" style={s.feedback}>
            <Text accessibilityLiveRegion="polite" style={[s.feedbackText, feedback.kind === 'bonus' && { color: C.gold }]}>
              {feedback.kind === 'level' ? tr('levelUp', { level: getSnakeLevel(game) }) : tr('bonusPoints', { points: feedback.points })}
            </Text>
          </View>}
        </View>
        <View style={[s.controlPanel, landscape && s.landscapeControls]}>
          <View style={s.controlActions}>
            <Text style={s.modeBadge}>{game.mode === 'ARCADE' ? '✦' : '○'} {tr(modeKey[game.mode])}</Text>
            <Text style={s.paceBadge}>{tr(paceKey[game.difficulty])}</Text>
            <Pressable accessibilityRole="button" onPress={returnToMenu} style={({ pressed }) => [s.menuButton, pressed && s.pressed]}>
              <Text style={s.menuButtonText}>‹ {tr('menu')}</Text>
            </Pressable>
          </View>
          <SnakeControls compact={compact && !landscape} enabled={game.status === 'PLAYING' && countdown === null} onDirection={turn} label={direction => tr(directionKey[direction])} />
        </View>
      </View>
      {!compact && <Text style={s.gameHint}>{Platform.OS === 'web' ? tr('keyboardHint') : tr('swipeHint')}</Text>}
    </>}
    {saveFailed && <Text accessibilityRole="alert" style={s.saveError}>{tr('saveFailed')}</Text>}

    <Dialog visible={showRunDialog || pendingNew || languageOpen}
      title={languageOpen ? sharedText('language') : pendingNew ? tr('replaceTitle') : tr(outcomeKey)}
      onClose={() => languageOpen ? setLanguageOpen(false) : pendingNew ? setPendingNew(false) : returnToMenu()}
      dismissible={languageOpen || pendingNew} footer={!languageOpen && !pendingNew ? runActions : undefined}>
      {languageOpen ? <>
        {LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }}
          onPress={() => { setLanguage(item.code); setLanguageOpen(false); }} style={[s.languageOption, language === item.code && s.languageSelected]}>
          <Text style={s.languageText}>{language === item.code ? '●' : '○'} {item.label}</Text>
        </Pressable>)}
        <Action secondary onPress={() => setLanguageOpen(false)}>{tr('cancel')}</Action>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, marginBottom: 8, maxWidth: 1000, width: '100%', alignSelf: 'center' },
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
  landscape: { flexDirection: 'row' },
  arena: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0, minWidth: 0 },
  controlPanel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 6 },
  landscapeControls: { width: 252, paddingTop: 0 },
  controlActions: { flex: 1, alignItems: 'flex-start', gap: 8 },
  modeBadge: { color: C.teal, fontSize: 13, fontWeight: '800' },
  paceBadge: { color: C.muted, fontSize: 11 },
  menuButton: { minHeight: 46, minWidth: 88, paddingHorizontal: 14, borderRadius: 15, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, marginTop: 4 },
  menuButtonText: { color: C.cream, fontSize: 13, fontWeight: '700' },
  gameHint: { color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  countdownOverlay: { ...StyleSheet.absoluteFill, backgroundColor: '#071B1C70', alignItems: 'center', justifyContent: 'center' },
  ready: { color: C.cream, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  countdown: { fontSize: 80, color: C.mint, fontWeight: '900' },
  feedback: { position: 'absolute', top: 8, right: 12, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: C.panelRaised, borderRadius: 12, borderWidth: 1, borderColor: C.line },
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
  dialogLanguage: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dialogLanguageText: { color: C.muted, fontSize: 12, textAlign: 'center' },
  languageOption: { minHeight: 52, padding: 14, borderRadius: 14, backgroundColor: C.panelRaised, borderWidth: 1, borderColor: C.line },
  languageSelected: { borderColor: C.mint },
  languageText: { color: C.cream, fontSize: 16, fontWeight: '700' },
});
