import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameText as Text } from '@/shared/components/game-text';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { LudoBoard } from './board/LudoBoard';
import { BOARD_THEMES, THEME_IDS } from './board/themes';
import { chooseComputerToken, createLudoGame, finishFor, legalTokens, moveLudoToken, rollLudo, type LudoColor, type LudoSetup } from './engine/ludoEngine';
import { translateLudo, type LudoTranslationKey } from './i18n/translations';
import { ludoOption } from './i18n/options';
import { useLudoMatch } from './data/useLudoMatch';
import { useLudoPreferences } from './data/useLudoPreferences';
import { useLudoAudio } from './audio/useLudoAudio';
import { LudoCelebration } from './board/LudoCelebration';

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function Die({ value }: { value: number | null }) {
  return <View style={styles.die}>{value === null ? <Text style={styles.question}>✦</Text> : Array.from({ length: 9 }, (_, index) =>
    <View key={index} style={[styles.pip, { opacity: PIPS[value].includes(index) ? 1 : 0 }]} />)}</View>;
}
function Button({ text, onPress }: { text: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{text}</Text></Pressable>;
}
export default function LudoScreen() {
  const { language } = useLanguage();
  const tr = (key: LudoTranslationKey, values?: Record<string, string | number>) => translateLudo(language, key, values);
  const label = (key: string) => ludoOption(language, key);
  const name = (color: LudoColor) => color === 'purple' || color === 'orange' ? label(color) : tr(color);
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const { game, setGame, ready, saveFailed } = useLudoMatch();
  const { preferences, setPreferences, ready: preferencesReady, failed } = useLudoPreferences();
  const { play, unlock } = useLudoAudio(preferences.sound, preferences.music, focused);
  const [menu, setMenu] = useState(true);
  const [rules, setRules] = useState(false);
  const [pending, setPending] = useState<LudoSetup | null>(null);
  const [foreground, setForeground] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [rollFace, setRollFace] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const previous = useRef(game);
  const palette = BOARD_THEMES[preferences.theme];
  const available = ready && preferencesReady;
  const size = Math.max(180, Math.floor(Math.min(landscape ? width - 220 : width - 12,
    height - insets.top - insets.bottom - (landscape ? 64 : 224), 650)));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => {
    if (focused && foreground && !menu) return;
    if (timer.current) clearInterval(timer.current);
    const reset = setTimeout(() => setRolling(false), 0);
    return () => clearTimeout(reset);
  }, [focused, foreground, menu]);
  useEffect(() => {
    const old = previous.current;
    previous.current = game;
    if (!game || !old || old === game || menu) return;
    if (game.event === 'capture' || game.event === 'home' || game.event === 'win') play(game.event);
    else if (old.seats !== game.seats) play('move');
    else if (old.seed !== game.seed && old.seats[old.turn].kind === 'computer') play('roll');
  }, [game, menu, play]);
  useEffect(() => {
    if (!game || menu || !focused || !foreground || game.phase === 'finished' || game.seats[game.turn].kind !== 'computer') return;
    const timeout = setTimeout(() => setGame(current => current !== game ? current : current.phase === 'roll'
      ? rollLudo(current) : moveLudoToken(current, chooseComputerToken(current) ?? -1)), 700);
    return () => clearTimeout(timeout);
  }, [game, menu, focused, foreground, setGame]);
  const roll = () => {
    if (!game || rolling || game.phase !== 'roll' || game.seats[game.turn].kind !== 'human') return;
    unlock(); play('roll'); setRolling(true);
    let ticks = 0;
    timer.current = setInterval(() => {
      setRollFace(face => face % 6 + 1);
      if (++ticks >= 6) {
        if (timer.current) clearInterval(timer.current);
        setGame(current => current === game ? rollLudo(current) : current); setRolling(false);
      }
    }, 70);
  };
  const move = (index: number) => { unlock(); setGame(current => current ? moveLudoToken(current, index) : current); };
  const start = (setup: LudoSetup) => { unlock(); play('start'); setGame(createLudoGame(setup)); setPending(null); setRolling(false); setMenu(false); };
  const requestStart = () => {
    const setup = { humans: preferences.humans, computers: preferences.computers };
    unlock(); play('tap');
    if (game && game.phase !== 'finished') setPending(setup); else start(setup);
  };
  const active = game?.seats[game.turn];
  const legal = game && game.seats[game.turn].kind === 'human' ? legalTokens(game) : [];
  const preview = createLudoGame({ humans: 4, computers: 0 }, 1);
  const changeCount = (key: 'humans' | 'computers', value: number) => {
    unlock(); play('tap'); setPreferences(current => {
      const next = { ...current, [key]: value };
      return next.humans >= 1 && next.computers >= 0 && next.humans + next.computers >= 2 && next.humans + next.computers <= 6 ? next : current;
    });
  };
  const seat = (color: LudoColor) => {
    if (!game) return null;
    const index = game.seats.findIndex(player => player.color === color);
    if (index < 0) return <View key={color} style={{ flex: 1, maxWidth: 230 }} />;
    const player = game.seats[index];
    const current = game.turn === index;
    const canRoll = current && player.kind === 'human' && game.phase === 'roll' && !rolling;
    return <Pressable key={color} accessibilityRole="button" accessibilityLabel={`${name(color)}: ${tr('roll')}`}
      accessibilityState={{ disabled: !canRoll }} disabled={!canRoll} onPress={roll}
      style={({ pressed }) => [styles.seat, { borderColor: current ? palette.colors[color] : '#FFFFFF25', backgroundColor: current ? '#FFFFFF15' : '#00000025' }, pressed && styles.pressed]}>
      <View style={[styles.playerDot, { backgroundColor: palette.colors[color] }]} />
      <View style={[styles.seatCopy, landscape && { display: 'none' }]}><Text numberOfLines={1} style={styles.seatName}>{name(color)}</Text>
        <Text style={styles.seatHint}>{player.kind === 'computer' ? tr('computer') : tr('player')} · {player.tokens.filter(p => p === finishFor(game)).length}/4</Text></View>
      <Die value={current && rolling ? rollFace : game.rolls?.[color] ?? (current ? game.die : null)} />
    </Pressable>;
  };
  const six = game && game.seats.length > 4;
  return <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('backToGames')} onPress={() => router.navigate('/explore')} style={styles.iconButton}><Text style={styles.iconText}>‹</Text></Pressable>
      <Text style={styles.title}>{tr('title')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label('options')} onPress={() => { unlock(); play('tap'); setRolling(false); if (game) setMenu(open => !open); }} style={styles.iconButton}><Text style={styles.iconText}>☰</Text></Pressable>
    </View>
    {menu ? <ScrollView pointerEvents={available ? 'auto' : 'none'} contentContainerStyle={styles.menuContent}>
      {!available && <Text style={styles.hint}>{tr('loading')}</Text>}
      <View style={styles.menuHero}><View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LudoBoard game={preview} size={132} legal={[]} boardLabel={tr('board')} onMove={() => undefined} tokenLabel={() => ''} theme={preferences.theme} />
      </View><View style={styles.heroCopy}><Text style={styles.heroTitle}>{tr('title')}</Text><Text style={styles.heroHint}>{tr('subtitle')}</Text>
        {available && game && <Button onPress={() => { unlock(); setMenu(false); }} text={label('resume')} />}</View></View>
      <Text style={styles.sectionTitle}>{label('match')}</Text>
      <View style={styles.setupRow}>{(['humans', 'computers'] as const).map(key => <View key={key} style={styles.counter}>
        <Text style={styles.counterLabel}>{label(key)}</Text><View style={styles.counterControls}>
          <Pressable accessibilityRole="button" accessibilityLabel={`− ${label(key)}`} onPress={() => changeCount(key, preferences[key] - 1)} style={styles.countButton}><Text style={styles.countText}>−</Text></Pressable>
          <Text style={styles.countValue}>{preferences[key]}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`+ ${label(key)}`} onPress={() => changeCount(key, preferences[key] + 1)} style={styles.countButton}><Text style={styles.countText}>+</Text></Pressable>
        </View></View>)}</View>
      <Text style={styles.hint}>{label(preferences.humans + preferences.computers > 4 ? 'sixPlayers' : 'fourPlayers')} · {label('local')}</Text>
      {available && <Button onPress={requestStart} text={label('start')} />}
      <Text style={styles.sectionTitle}>{label('style')}</Text>
      <View style={styles.themeRow}>{THEME_IDS.map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: preferences.theme === id }}
        accessibilityLabel={label(id)} onPress={() => { unlock(); play('tap'); setPreferences(current => ({ ...current, theme: id })); }}
        style={[styles.themeCard, { borderColor: preferences.theme === id ? '#FFD56D' : '#FFFFFF30', backgroundColor: BOARD_THEMES[id].paper }]}>
        <View style={styles.swatches}>{Object.values(BOARD_THEMES[id].colors).slice(0, 4).map(color => <View key={color} style={[styles.swatch, { backgroundColor: color }]} />)}</View>
        <Text style={[styles.themeName, { color: BOARD_THEMES[id].ink }]}>{label(id)}</Text>
      </Pressable>)}</View>
      <View style={styles.audioRow}>{(['music', 'sound'] as const).map(key => <Pressable key={key} accessibilityRole="switch" accessibilityState={{ checked: preferences[key] }}
        onPress={() => { unlock(); setPreferences(current => ({ ...current, [key]: !current[key] })); }} style={styles.audioButton}>
        <Text style={styles.audioText}>{label(key)}</Text><Text style={{ color: preferences[key] ? '#7EE2BA' : '#A6AFC1', fontWeight: '900' }}>{label(preferences[key] ? 'on' : 'off')}</Text>
      </Pressable>)}</View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: rules }} onPress={() => setRules(open => !open)} style={styles.rulesButton}><Text style={styles.hint}>{tr('rules')} {rules ? '⌃' : '⌄'}</Text></Pressable>
      {rules && <Text style={styles.rulesText}>{tr('rulesBody')}</Text>}
      <Text style={styles.saved}>{label('saved')}</Text>
    </ScrollView> : game && active && <View style={[styles.playArea, landscape && styles.landscape]}>
      <View style={[styles.table, landscape && { width: size + 12 }]}>
        {!landscape && <View style={styles.seatRow}>{(six ? ['red', 'green', 'yellow'] : ['red', 'green']).map(color => seat(color as LudoColor))}</View>}
        <View>
          <LudoBoard game={game} size={size} legal={legal} boardLabel={tr('board')} onMove={move} theme={preferences.theme}
            tokenLabel={(color, index) => tr('token', { color: name(color), number: index + 1 })} />
          <LudoCelebration event={game.event} revision={game.seed} color={palette.colors[active.color]} />
        </View>
        {!landscape && <View style={styles.seatRow}>{(six ? ['blue', 'purple', 'orange'] : ['blue', 'yellow']).map(color => seat(color as LudoColor))}</View>}
      </View>
      <View style={[styles.actions, landscape && styles.landscapeActions]}>
        {landscape && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{game.seats.map(player => <View key={player.color} style={{ width: '46%' }}>{seat(player.color)}</View>)}</View>}
        <Text accessibilityLiveRegion="polite" style={[styles.turnText, { color: palette.colors[active.color] }]}>{game.winner ? tr('win', { color: name(game.winner) }) : tr('turn', { color: name(active.color) })}</Text>
        <Text style={styles.hint}>{active.kind === 'computer' ? tr('waitingComputer') : game.phase === 'choose' ? label('choose') : tr('roll')}</Text>
        {game.phase === 'choose' && active.kind === 'human' && <View style={styles.choices}>{legal.map(index => <Pressable key={index} accessibilityRole="button"
          accessibilityLabel={tr('token', { color: name(active.color), number: index + 1 })} onPress={() => move(index)} style={[styles.choice, { backgroundColor: palette.colors[active.color] }]}><Text style={styles.choiceText}>{index + 1}</Text></Pressable>)}</View>}
        {(game.event === 'capture' || game.event === 'home' || game.event === 'threeSixes' || game.event === 'noMove') && <Text style={styles.event}>{tr(game.event)}</Text>}
        {game.winner && <Button onPress={() => setMenu(true)} text={tr('playAgain')} />}
      </View>
    </View>}
    {(saveFailed || failed) && <Text accessibilityRole="alert" style={styles.error}>{tr('saveFailed')}</Text>}
    {pending && <View style={styles.modalLayer}><View style={styles.modalCard}><Text style={styles.sectionTitle}>{tr('replaceTitle')}</Text>
      <Text style={styles.rulesText}>{tr('replaceMessage')}</Text><Button onPress={() => start(pending)} text={tr('confirm')} />
      <Button onPress={() => setPending(null)} text={tr('cancel')} /></View></View>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#112D2B' },
  header: { height: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#FFE6A3', fontSize: 23, fontWeight: '900', letterSpacing: 3 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, iconText: { color: '#FFEDB7', fontSize: 28 },
  menuContent: { width: '100%', maxWidth: 580, alignSelf: 'center', padding: 16, gap: 12 },
  menuHero: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 8 },
  heroCopy: { flex: 1, gap: 12 }, heroTitle: { color: '#FFDF84', fontSize: 38, fontWeight: '900' }, heroHint: { color: '#CCE0D5', fontSize: 14 },
  sectionTitle: { color: '#FFE6A3', fontWeight: '900', fontSize: 18, marginTop: 4 },
  setupRow: { flexDirection: 'row', gap: 12 }, counter: { flex: 1, gap: 8 }, counterLabel: { color: '#D7E5D6', fontSize: 13, fontWeight: '700' },
  counterControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#061B1B66', borderRadius: 30, padding: 3 },
  countButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#385A4C', alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#FFE6A3', fontSize: 25, fontWeight: '900' }, countValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  hint: { color: '#CEDDD1', fontSize: 12, textAlign: 'center' },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeCard: { width: '48%', minHeight: 70, borderRadius: 12, borderWidth: 3, padding: 8, gap: 5, alignItems: 'center' },
  swatches: { flexDirection: 'row', gap: 6 }, swatch: { width: 24, height: 24, borderRadius: 12 }, themeName: { fontSize: 13, fontWeight: '900' },
  audioRow: { flexDirection: 'row', gap: 8 }, audioButton: { flex: 1, padding: 12, backgroundColor: '#21453D', borderRadius: 18, gap: 8 },
  audioText: { color: '#FFF0BD', fontSize: 13, fontWeight: '700' }, rulesButton: { minHeight: 44, justifyContent: 'center' },
  rulesText: { color: '#DFE8D9', fontSize: 13, lineHeight: 21 }, saved: { color: '#95B9A8', fontSize: 11, textAlign: 'center' },
  playArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, gap: 8 }, landscape: { flexDirection: 'row', justifyContent: 'center' },
  table: { alignItems: 'center', gap: 6, width: '100%' }, seatRow: { width: '100%', maxWidth: 650, flexDirection: 'row', justifyContent: 'space-between', gap: 6, paddingHorizontal: 6 },
  seat: { flex: 1, minHeight: 52, maxWidth: 230, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderRadius: 10, padding: 4 },
  seatCopy: { flex: 1, minWidth: 0 }, seatName: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, seatHint: { color: '#C2D3C9', fontSize: 9 },
  playerDot: { width: 9, height: 9, borderRadius: 5 },
  actions: { width: '100%', maxWidth: 600, minHeight: 78, gap: 4, paddingHorizontal: 12, alignItems: 'center' }, landscapeActions: { width: 190 },
  turnText: { fontSize: 17, fontWeight: '900', textAlign: 'center', textShadowColor: '#000000', textShadowRadius: 2 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, choice: { width: 46, height: 46, borderWidth: 2, borderColor: '#FFE39E', borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  choiceText: { color: '#111111', fontWeight: '900', fontSize: 18 }, event: { color: '#FFE6A3', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  die: { width: 38, height: 38, borderRadius: 7, backgroundColor: '#FFFBED', flexDirection: 'row', flexWrap: 'wrap', padding: 6, justifyContent: 'space-between', alignContent: 'space-between' },
  pip: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#172B2B' }, question: { color: '#304B41', fontSize: 21, fontWeight: '900', textAlign: 'center', width: '100%', lineHeight: 25 },
  button: { minHeight: 48, backgroundColor: '#F7C963', borderRadius: 25, borderWidth: 2, borderColor: '#FFE5A2', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { color: '#253A2E', fontSize: 17, fontWeight: '900' }, pressed: { opacity: 0.7 },
  error: { color: '#FFD1CA', fontSize: 12, textAlign: 'center' }, modalLayer: { ...StyleSheet.absoluteFill, backgroundColor: '#031411EE', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 22, backgroundColor: '#254E42', borderWidth: 2, borderColor: '#D7B263', gap: 16 },
});
