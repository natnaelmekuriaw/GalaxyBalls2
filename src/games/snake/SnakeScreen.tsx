import { Image } from 'expo-image';
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
import { createSnakeCountdown } from './controls/countdown';
import { getDirectionForKey } from './controls/input';
import { useSnakeData } from './data/SnakeDataProvider';
import {
  createSnakeGame, getSnakeTickMs, pauseSnake, queueDirection, resumeSnake,
  SNAKE_DIFFICULTIES, stepSnake, type Direction, type SnakeDifficulty, type SnakeState,
} from './engine/snakeEngine';
import { translateSnake, type SnakeTranslationKey } from './i18n/translations';

const ICON = require('@/assets/games/snake/icon.png');
const directionKey: Record<Direction, SnakeTranslationKey> = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right' };
const paceKey: Record<SnakeDifficulty, SnakeTranslationKey> = { EASY: 'easy', NORMAL: 'normal', FAST: 'fast' };

function Action({ children, onPress, secondary = false }: { children: ReactNode; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => [styles.action, secondary && styles.secondaryAction, pressed && styles.pressed]}>
    <Text style={[styles.actionText, secondary && styles.secondaryActionText]}>{children}</Text>
  </Pressable>;
}

function Dialog({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={styles.dialog}>
        <ScrollView contentContainerStyle={styles.dialogContent}>
          <Text accessibilityRole="header" style={styles.dialogTitle}>{title}</Text>
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

export default function SnakeScreen() {
  const { language, setLanguage, t: sharedText } = useLanguage();
  const { soundsEnabled, setSoundsEnabled, hapticsEnabled } = useAppPreferences();
  const { currentGame, bestScores, lastDifficulty, saveFailed, saveGame, finishGame, setDifficulty, flush } = useSnakeData();
  const isFocused = useIsFocused();
  const { play, stop } = useSnakeSounds(soundsEnabled && isFocused);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height && height < 650;
  const [game, setGame] = useState(() => currentGame ?? createSnakeGame(lastDifficulty));
  const stateRef = useRef(game);
  const [inGame, setInGame] = useState(false);
  const inGameRef = useRef(false);
  const [pace, setPace] = useState(lastDifficulty);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownClock] = useState(() => createSnakeCountdown());
  const [pendingNew, setPendingNew] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [arena, setArena] = useState({ width: 0, height: 0 });
  const tr = (key: SnakeTranslationKey, values?: Record<string, string | number>) => translateSnake(language, key, values);
  const terminal = game.status === 'GAME_OVER' || game.status === 'WON';
  const boardSize = Math.max(0, Math.floor(Math.min(arena.width - 8, arena.height - 8, 560)));

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
    if (next !== previous) {
      apply(next);
      play('turn');
    }
  }, [apply, play]);

  const returnToMenu = () => {
    pause();
    inGameRef.current = false;
    setInGame(false);
    setPace(stateRef.current.difficulty);
  };
  const leave = () => {
    pause();
    if (router.canGoBack()) router.back();
    else router.replace('/explore');
  };
  const startFresh = () => {
    setPendingNew(false);
    setDifficulty(pace);
    beginCountdown(createSnakeGame(pace));
  };
  const requestNew = () => {
    if (currentGame) setPendingNew(true);
    else startFresh();
  };

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
        play('eat');
        if (hapticsEnabled && Platform.OS !== 'web') Vibration.vibrate(12);
      }
    }, tickMs);
    return () => clearInterval(timer);
  }, [inGame, isFocused, game.status, tickMs, apply, play, stop, hapticsEnabled]);

  useFocusEffect(useCallback(() => () => pause(), [pause]));
  useEffect(() => {
    const change = AppState.addEventListener('change', (next) => { if (next !== 'active') pause(); });
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

  const stats = (difficulty: SnakeDifficulty, score: number, length?: number) => (
    <View style={styles.stats}>
      {[{ label: tr('score'), value: score }, { label: tr('best'), value: bestScores[difficulty] },
        ...(length ? [{ label: tr('length'), value: length }] : [])].map((item) => (
        <View key={item.label} style={styles.stat}>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text style={styles.statValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View testID="snake-screen" style={[styles.screen, {
      paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8,
      paddingLeft: insets.left + 12, paddingRight: insets.right + 12,
    }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('backToGames')} onPress={leave} style={styles.iconButton}>
          <Text style={styles.headerIcon}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.brand}>{tr('title')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${sharedText('language')}: ${LANGUAGES.find(item => item.code === language)?.label}`}
          onPress={() => { pause(); setLanguageOpen(true); }} style={styles.iconButton}>
          <Text style={styles.languageCode}>{language === 'am' ? 'አማ' : language.toUpperCase()}</Text>
        </Pressable>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: soundsEnabled }}
          accessibilityLabel={tr(soundsEnabled ? 'soundOn' : 'soundOff')}
          onPress={() => setSoundsEnabled(!soundsEnabled)} style={styles.iconButton}>
          <Text style={[styles.soundIcon, !soundsEnabled && styles.muted]}>{soundsEnabled ? '♫' : '♪'}</Text>
        </Pressable>
        {inGame && !terminal && (
          <Pressable accessibilityRole="button" accessibilityLabel={tr(game.status === 'PLAYING' || countdown !== null ? 'pause' : 'continue')}
            onPress={() => game.status === 'PLAYING' || countdown !== null ? pause() : beginCountdown(stateRef.current)} style={styles.iconButton}>
            <Text style={styles.pauseIcon}>{game.status === 'PLAYING' || countdown !== null ? 'Ⅱ' : '▶'}</Text>
          </Pressable>
        )}
      </View>

      {!inGame ? (
        <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuContent}>
          <View style={styles.menuCard}>
            <Image source={ICON} style={styles.heroIcon} contentFit="contain" accessible={false} />
            <Text accessibilityRole="header" style={styles.title}>{tr('title')}</Text>
            <Text style={styles.tagline}>{tr('tagline')}</Text>
            <View style={styles.bestPill}><Text style={styles.bestLabel}>★ {tr('best')} · {tr(paceKey[pace])}</Text><Text style={styles.bestValue}>{bestScores[pace]}</Text></View>
            <Text style={styles.sectionLabel}>{tr('difficulty')}</Text>
            <View accessibilityRole="radiogroup" style={styles.paces}>
              {SNAKE_DIFFICULTIES.map((difficulty) => (
                <Pressable key={difficulty} accessibilityRole="radio" accessibilityState={{ checked: pace === difficulty }}
                  onPress={() => { setPace(difficulty); setDifficulty(difficulty); }}
                  style={[styles.pace, pace === difficulty && styles.paceSelected]}>
                  <Text style={[styles.paceText, pace === difficulty && styles.paceTextSelected]}>{tr(paceKey[difficulty])}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.smallNote}>{tr('speedHint')}</Text>
            {currentGame && (
              <Action onPress={() => beginCountdown(currentGame)}>
                ▶ {tr('resume')} · {tr(paceKey[currentGame.difficulty])} · {currentGame.score}
              </Action>
            )}
            <Action secondary={!!currentGame} onPress={requestNew}>{currentGame ? tr('newGame') : `▶  ${tr('play')}`}</Action>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }}
              onPress={() => setRulesOpen(!rulesOpen)} style={styles.rulesButton}>
              <Text style={styles.rulesButtonText}>{rulesOpen ? '−' : '+'} {tr('howToPlay')}</Text>
            </Pressable>
            {rulesOpen && <Text style={styles.rules}>{tr('rules')}{'\n\n'}{tr('controlsHint')}{'\n'}{Platform.OS === 'web' ? tr('keyboardHint') : tr('swipeHint')}</Text>}
          </View>
        </ScrollView>
      ) : (
        <>
          {stats(game.difficulty, game.score, game.body.length)}
          <View style={[styles.playArea, landscape && styles.landscape]}>
            <View style={styles.arena} onLayout={event => {
              const { width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout;
              setArena(previous => previous.width === measuredWidth && previous.height === measuredHeight ? previous : { width: measuredWidth, height: measuredHeight });
            }}>
              {boardSize > 0 && <SnakeBoard state={game} size={boardSize} enabled={game.status === 'PLAYING' && countdown === null}
                onDirection={turn} label={`${tr('title')}, ${tr('score')} ${game.score}, ${tr('length')} ${game.body.length}`}>
                {(countdown !== null || game.status !== 'PLAYING') && (
                  <View style={styles.boardOverlay}>
                    <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.overlayTitle, countdown !== null && styles.countdown]}>
                      {countdown !== null ? tr('countdown', { count: countdown }) : tr(game.status === 'WON' ? 'won' : game.status === 'GAME_OVER' ? 'gameOver' : 'paused')}
                    </Text>
                    {countdown === null && <>
                      <Text style={styles.overlayScore}>{tr('score')} {game.score} · {tr('best')} {bestScores[game.difficulty]}</Text>
                      <Pressable accessibilityRole="button" onPress={() => terminal ? startFresh() : beginCountdown(stateRef.current)} style={styles.overlayButton}>
                        <Text style={styles.overlayButtonText}>{tr(terminal ? 'playAgain' : 'continue')}</Text>
                      </Pressable>
                    </>}
                  </View>
                )}
              </SnakeBoard>}
            </View>
            <View style={[styles.controlPanel, landscape && styles.landscapeControls]}>
              <View style={styles.controlActions}>
                <Text style={styles.paceBadge}>{tr(paceKey[game.difficulty])}</Text>
                <Text style={styles.level}>{tr('level')} {Math.floor(game.score / 50) + 1}</Text>
                <Pressable accessibilityRole="button" onPress={returnToMenu} style={styles.menuButton}>
                  <Text style={styles.menuButtonText}>‹ {tr('menu')}</Text>
                </Pressable>
              </View>
              <SnakeControls enabled={game.status === 'PLAYING' && countdown === null} onDirection={turn} label={direction => tr(directionKey[direction])} />
            </View>
          </View>
          {height > 620 && <Text style={styles.gameHint}>{Platform.OS === 'web' ? tr('keyboardHint') : tr('swipeHint')}</Text>}
        </>
      )}
      {saveFailed && <Text accessibilityRole="alert" style={styles.saveError}>{tr('saveFailed')}</Text>}

      <Dialog visible={pendingNew} title={tr('replaceTitle')} onClose={() => setPendingNew(false)}>
        <Text style={styles.dialogBody}>{tr('replaceMessage')}</Text>
        <Action onPress={startFresh}>{tr('replaceAndStart')}</Action>
        <Action secondary onPress={() => setPendingNew(false)}>{tr('cancel')}</Action>
      </Dialog>
      <Dialog visible={languageOpen} title={sharedText('language')} onClose={() => setLanguageOpen(false)}>
        {LANGUAGES.map(item => (
          <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }}
            onPress={() => { setLanguage(item.code); setLanguageOpen(false); }} style={[styles.languageOption, language === item.code && styles.paceSelected]}>
            <Text style={styles.languageText}>{language === item.code ? '●' : '○'} {item.label}</Text>
          </Pressable>
        ))}
        <Action secondary onPress={() => setLanguageOpen(false)}>{tr('cancel')}</Action>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050F0C' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, marginBottom: 6, maxWidth: 1000, width: '100%', alignSelf: 'center' },
  iconButton: { minWidth: 44, height: 44, borderRadius: 14, backgroundColor: '#12261C', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294530' },
  headerIcon: { color: '#D9F99D', fontSize: 34, lineHeight: 36 },
  brand: { color: '#ECFCCB', fontSize: 23, fontWeight: '900', flex: 1, letterSpacing: 1 },
  languageCode: { color: '#D9F99D', fontSize: 12, fontWeight: '800' },
  soundIcon: { color: '#D9F99D', fontSize: 25, fontWeight: '700' },
  muted: { color: '#829778' },
  pauseIcon: { color: '#D9F99D', fontSize: 21, fontWeight: '800' },
  menuScroll: { flex: 1 },
  menuContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  menuCard: { width: '100%', maxWidth: 400, gap: 12, alignItems: 'stretch', paddingHorizontal: 8 },
  heroIcon: { width: 132, height: 132, borderRadius: 30, alignSelf: 'center', marginBottom: 2 },
  title: { color: '#D9F99D', fontSize: 42, fontWeight: '900', textAlign: 'center', letterSpacing: 3 },
  tagline: { color: '#A7BEA2', fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: 6 },
  bestPill: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#14261A', borderColor: '#365314', borderWidth: 1 },
  bestLabel: { color: '#BFCEB3', fontSize: 14, flexShrink: 1 },
  bestValue: { color: '#FDE68A', fontSize: 26, fontWeight: '900' },
  sectionLabel: { color: '#D8E9CB', fontSize: 14, fontWeight: '700', marginTop: 4 },
  paces: { flexDirection: 'row', gap: 8 },
  pace: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#14261A', borderWidth: 1, borderColor: '#294530', alignItems: 'center', justifyContent: 'center', padding: 6 },
  paceSelected: { backgroundColor: '#294318', borderColor: '#A3E635', borderWidth: 1 },
  paceText: { color: '#A7BEA2', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  paceTextSelected: { color: '#ECFCCB' },
  smallNote: { color: '#829778', fontSize: 12, lineHeight: 18 },
  action: { backgroundColor: '#A3E635', borderRadius: 15, minHeight: 52, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#15250B', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  secondaryAction: { backgroundColor: '#14261A', borderWidth: 1, borderColor: '#4D7C0F' },
  secondaryActionText: { color: '#D9F99D' },
  pressed: { opacity: 0.76 },
  rulesButton: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  rulesButtonText: { color: '#B4C8A7', fontSize: 14, fontWeight: '600' },
  rules: { color: '#A7BEA2', fontSize: 14, lineHeight: 22, paddingBottom: 12 },
  stats: { flexDirection: 'row', width: '100%', maxWidth: 1000, alignSelf: 'center', marginBottom: 8, gap: 8 },
  stat: { flex: 1, backgroundColor: '#122319', paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
  statLabel: { color: '#A7BEA2', fontSize: 11 },
  statValue: { color: '#ECFCCB', fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  playArea: { flex: 1, width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 8 },
  landscape: { flexDirection: 'row' },
  arena: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0, minWidth: 0 },
  controlPanel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 8 },
  landscapeControls: { width: 260, paddingTop: 0 },
  controlActions: { flex: 1, alignItems: 'flex-start', gap: 10 },
  paceBadge: { color: '#D9F99D', fontSize: 14, fontWeight: '800' },
  level: { color: '#829778', fontSize: 12 },
  menuButton: { minHeight: 48, minWidth: 80, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#14261A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#294530' },
  menuButtonText: { color: '#D9F99D', fontSize: 14, fontWeight: '700' },
  gameHint: { color: '#829778', fontSize: 12, textAlign: 'center', marginTop: 8 },
  boardOverlay: { ...StyleSheet.absoluteFill, backgroundColor: '#050F0CE8', padding: 14, alignItems: 'center', justifyContent: 'center', gap: 12 },
  overlayTitle: { color: '#ECFCCB', fontSize: 25, fontWeight: '900', textAlign: 'center' },
  countdown: { fontSize: 64, color: '#A3E635' },
  overlayScore: { color: '#B4C8A7', fontSize: 13, textAlign: 'center' },
  overlayButton: { backgroundColor: '#A3E635', borderRadius: 12, minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, justifyContent: 'center' },
  overlayButtonText: { color: '#15250B', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  saveError: { color: '#FDA4AF', fontSize: 12, lineHeight: 18, paddingVertical: 5 },
  backdrop: { flex: 1, backgroundColor: '#000000B8', alignItems: 'center', justifyContent: 'center', padding: 22 },
  dialog: { width: '100%', maxWidth: 420, maxHeight: '85%', borderRadius: 22, backgroundColor: '#112218', borderColor: '#4D7C0F', borderWidth: 1, overflow: 'hidden' },
  dialogContent: { padding: 22, gap: 14 },
  dialogTitle: { color: '#ECFCCB', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  dialogBody: { color: '#B4C8A7', fontSize: 15, lineHeight: 23 },
  languageOption: { minHeight: 50, padding: 14, borderRadius: 12, backgroundColor: '#14261A' },
  languageText: { color: '#ECFCCB', fontSize: 16, fontWeight: '700' },
});
