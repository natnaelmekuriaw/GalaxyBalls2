import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameText as Text } from '@/shared/components/game-text';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { LudoBoard } from './board/LudoBoard';
import { COLORS } from './board/geometry';
import { chooseComputerToken, createLudoGame, FINISH, legalTokens, moveLudoToken, rollLudo,
  type LudoSetup } from './engine/ludoEngine';
import { translateLudo, type LudoTranslationKey } from './i18n/translations';
import { useLudoMatch } from './data/useLudoMatch';

const MENU_PREVIEW = createLudoGame({ humans: 4, computers: 0 }, 1);
const BOT_ACCENTS = [COLORS.yellow, COLORS.green, COLORS.blue];
const LOCAL_ACCENTS = [COLORS.red, COLORS.green, COLORS.blue];

function Die({ value, label }: { value: number | null; label: string }) {
  const pips: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8],
    4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  return <View style={styles.die} accessibilityLabel={label}>
    {value === null ? <Text style={styles.dieQuestion}>?</Text> : Array.from({ length: 9 }, (_, index) =>
      <View key={index} style={[styles.pipSlot, pips[value].includes(index) && styles.pip]} />)}
  </View>;
}

function PrimaryButton({ children, onPress, secondary = false }: { children: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => [styles.primaryButton, secondary && styles.secondaryButton, pressed && styles.pressed]}>
    <Text style={[styles.primaryText, secondary && styles.secondaryText]}>{children}</Text>
  </Pressable>;
}

export default function LudoScreen() {
  const { language } = useLanguage();
  const isFocused = useIsFocused();
  const tr = (key: LudoTranslationKey, values?: Record<string, string | number>) => translateLudo(language, key, values);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { game, setGame, ready, saveFailed } = useLudoMatch();
  const [showMenu, setShowMenu] = useState(true);
  const [pendingSetup, setPendingSetup] = useState<LudoSetup | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dieSpin] = useState(() => new Animated.Value(0));
  const boardSize = Math.max(220, Math.floor(Math.min(width - 30, height - 290, 510)));

  useEffect(() => () => { if (rollTimer.current) clearTimeout(rollTimer.current); }, []);
  useEffect(() => {
    if (isFocused && !showMenu) return;
    if (rollTimer.current) clearTimeout(rollTimer.current);
    rollTimer.current = null;
    dieSpin.stopAnimation(() => setRolling(false));
  }, [isFocused, showMenu, dieSpin]);

  useEffect(() => {
    if (!isFocused || showMenu || !game || game.phase === 'finished' || game.seats[game.turn].kind !== 'computer') return;
    const timer = setTimeout(() => setGame(current => {
      if (current !== game) return current;
      return current.phase === 'roll' ? rollLudo(current)
        : moveLudoToken(current, chooseComputerToken(current) ?? -1);
    }), 500);
    return () => clearTimeout(timer);
  }, [game, showMenu, isFocused, setGame]);

  const start = (setup: LudoSetup) => {
    setGame(createLudoGame(setup));
    setPendingSetup(null);
    setShowMenu(false);
  };
  const roll = () => {
    if (rolling || !game || game.phase !== 'roll' || game.seats[game.turn].kind !== 'human') return;
    setRolling(true);
    dieSpin.setValue(0);
    Animated.timing(dieSpin, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    rollTimer.current = setTimeout(() => {
      setGame(current => current ? rollLudo(current) : current);
      setRolling(false);
      rollTimer.current = null;
      dieSpin.setValue(0);
    }, 420);
  };
  const requestStart = (setup: LudoSetup) => {
    if (game && game.phase !== 'finished') setPendingSetup(setup);
    else start(setup);
  };
  const active = game?.seats[game.turn];
  const legal = game ? legalTokens(game) : [];
  const colorName = (color: NonNullable<typeof active>['color']) => tr(color);
  const eventText = game?.event === 'capture' || game?.event === 'home' || game?.event === 'noMove' || game?.event === 'threeSixes'
    ? tr(game.event) : null;

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={showMenu ? tr('backToGames') : tr('menu')}
          onPress={() => showMenu ? router.navigate('/explore') : setShowMenu(true)} style={styles.backButton}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>{tr('title')}</Text>
          {showMenu && <Text style={styles.subtitle}>{tr('subtitle')}</Text>}
        </View>
        {!showMenu && <Pressable accessibilityRole="button" accessibilityLabel={tr('menu')} onPress={() => setShowMenu(true)} style={styles.headerMenu}>
          <Text style={styles.headerMenuText}>☰</Text>
        </Pressable>}
      </View>

      {showMenu ? <View style={styles.menu}>
        <View style={styles.hero}>
          <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.heroBoard}>
            <LudoBoard game={MENU_PREVIEW} size={136} legal={[]} boardLabel={tr('board')}
              onMove={() => undefined} tokenLabel={(color, index) => tr('token', { color: colorName(color), number: index + 1 })} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{tr('chooseMatch')}</Text>
            <Text style={styles.heroHint}>{tr('subtitle')}</Text>
            <View style={styles.heroTokens}>{(['red', 'green', 'yellow', 'blue'] as const).map(color =>
              <View key={color} style={[styles.heroToken, { backgroundColor: COLORS[color] }]} />)}</View>
          </View>
        </View>
        {!ready && <Text style={styles.rulesBody}>{tr('loading')}</Text>}
        {ready && game && game.phase !== 'finished' && <PrimaryButton onPress={() => setShowMenu(false)}>{tr('resume')}</PrimaryButton>}
        {ready && <>
        <Text style={styles.sectionTitle}>{tr('computerMatches')}</Text>
        <View style={styles.presets}>{[1, 2, 3].map(count =>
          <Pressable key={`bot-${count}`} accessibilityRole="button" onPress={() => requestStart({ humans: 1, computers: count })}
            style={({ pressed }) => [styles.preset, { borderLeftColor: BOT_ACCENTS[count - 1] }, pressed && styles.pressed]}>
            <View style={[styles.presetBadge, { backgroundColor: '#F8CE79' }]}><Text style={styles.presetBadgeText}>{count}</Text></View>
            <Text style={styles.presetText}>{tr('vsBots', { count })}</Text><Text style={styles.presetArrow}>›</Text>
          </Pressable>)}</View>
        <Text style={styles.sectionTitle}>{tr('localMatches')}</Text>
        <View style={styles.presets}>{[2, 3, 4].map(count =>
          <Pressable key={`local-${count}`} accessibilityRole="button" onPress={() => requestStart({ humans: count, computers: 0 })}
            style={({ pressed }) => [styles.preset, { borderLeftColor: LOCAL_ACCENTS[count - 2] }, pressed && styles.pressed]}>
            <View style={[styles.presetBadge, { backgroundColor: '#75D4AF' }]}><Text style={styles.presetBadgeText}>{count}</Text></View>
            <Text style={styles.presetText}>{tr('localPlayers', { count })}</Text><Text style={styles.presetArrow}>›</Text>
          </Pressable>)}</View>
        </>}
        {saveFailed && <Text accessibilityRole="alert" style={styles.saveError}>{tr('saveFailed')}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }} onPress={() => setRulesOpen(open => !open)} style={styles.rulesToggle}>
          <Text style={styles.rulesTitle}>{tr('rules')} {rulesOpen ? '⌃' : '⌄'}</Text>
        </Pressable>
        {rulesOpen && <Text style={styles.rulesBody}>{tr('rulesBody')}</Text>}
      </View> : game && active && <View style={styles.game}>
        <View style={styles.turnCard}>
          <View style={[styles.turnEmblem, { backgroundColor: COLORS[active.color] }]}>
            <View style={styles.turnEmblemDot} />
          </View>
          <View style={styles.turnCopy}><Text style={[styles.turnTitle, { color: COLORS[active.color] }]}>{game.winner ? tr('win', { color: colorName(game.winner) })
            : tr('turn', { color: colorName(active.color) })}</Text>
            <Text style={styles.turnHint}>{game.winner ? tr('playAgain') : active.kind === 'computer' ? tr('waitingComputer')
              : game.phase === 'choose' ? tr('chooseToken') : game.event === 'capture' || game.event === 'home' || game.lastRoll === 6 && game.sixes > 0
                ? tr('rollAgain') : tr('roll')}</Text>
          </View>
          <View style={styles.turnCount}><Text style={styles.turnCountText}>{tr('homeCount', { count: active.tokens.filter(progress => progress === FINISH).length })}</Text></View>
        </View>
        <View style={styles.boardFrame}>
          <LudoBoard game={game} size={boardSize} legal={legal} boardLabel={tr('board')} onMove={index => setGame(current => current ? moveLudoToken(current, index) : current)}
            tokenLabel={(color, index) => tr('token', { color: colorName(color), number: index + 1 })} />
        </View>
        <View style={styles.actionArea}>
          {game.phase === 'finished' ? <PrimaryButton onPress={() => setShowMenu(true)}>{tr('playAgain')}</PrimaryButton>
            : active.kind === 'human' && game.phase === 'roll' ? <Pressable accessibilityRole="button" accessibilityLabel={tr('roll')}
                accessibilityState={{ disabled: rolling }} disabled={rolling} onPress={roll}
                style={({ pressed }) => [styles.rollButton, pressed && styles.pressed]}>
                <Animated.View style={{ transform: [{ rotate: dieSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) }] }}>
                  <Die value={rolling ? null : game.die ?? game.lastRoll} label={tr('dieValue', { value: game.die ?? game.lastRoll ?? '—' })} />
                </Animated.View>
                <Text style={styles.rollLabel}>{tr('roll')}</Text><Text style={styles.rollArrow}>›</Text>
              </Pressable>
              : active.kind === 'human' && game.phase === 'choose' ? <View style={styles.choices}>
              <Die value={game.die} label={tr('dieValue', { value: game.die ?? '—' })} />
              {legal.map(index => <Pressable key={index} accessibilityRole="button"
                accessibilityLabel={tr('token', { color: colorName(active.color), number: index + 1 })}
                onPress={() => setGame(current => current ? moveLudoToken(current, index) : current)} style={styles.choice}>
                <View style={[styles.choiceDot, { backgroundColor: COLORS[active.color] }]} />
                <Text style={styles.choiceText}>{index + 1}</Text>
              </Pressable>)}
              </View> : <View style={styles.waiting}><Die value={game.die ?? game.lastRoll} label={tr('dieValue', { value: game.die ?? game.lastRoll ?? '—' })} />
                <Text style={styles.waitingText}>{tr('waitingComputer')}</Text></View>}
          {eventText && <Text accessibilityLiveRegion="polite" style={styles.eventText}>{eventText}</Text>}
        </View>
        <View style={styles.seats}>{game.seats.map((seat, index) =>
          <View key={seat.color} style={[styles.seat, index === game.turn && styles.activeSeat, { borderColor: index === game.turn ? COLORS[seat.color] : '#465269' }]}>
            <View style={[styles.seatDot, { backgroundColor: COLORS[seat.color] }]} />
            <View style={styles.seatCopy}>
              <Text numberOfLines={1} style={styles.seatName}>{colorName(seat.color)} · {tr(seat.kind === 'computer' ? 'computer' : 'player')}</Text>
              <Text style={styles.seatProgress}>{tr('homeCount', { count: seat.tokens.filter(progress => progress === FINISH).length })}</Text>
            </View>
          </View>)}</View>
        {saveFailed && <Text accessibilityRole="alert" style={styles.saveError}>{tr('saveFailed')}</Text>}
      </View>}
    </ScrollView>
    {pendingSetup && <View style={styles.modalLayer}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{tr('replaceTitle')}</Text>
        <Text style={styles.modalBody}>{tr('replaceMessage')}</Text>
        <PrimaryButton onPress={() => start(pendingSetup)}>{tr('confirm')}</PrimaryButton>
        <PrimaryButton secondary onPress={() => setPendingSetup(null)}>{tr('cancel')}</PrimaryButton>
      </View>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101B2E' },
  content: { alignItems: 'center', paddingHorizontal: 10, gap: 9 },
  header: { width: '100%', maxWidth: 560, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#25354E', alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: '#F7E9BA', fontSize: 34, lineHeight: 38 },
  headerCopy: { flex: 1 }, title: { color: '#FFF1CC', fontSize: 23, fontWeight: '900' },
  subtitle: { color: '#91A4C3', fontSize: 12 },
  headerMenu: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#25354E', alignItems: 'center', justifyContent: 'center' },
  headerMenuText: { color: '#F7E9BA', fontSize: 22 },
  menu: { width: '100%', maxWidth: 560, gap: 14 },
  hero: { minHeight: 166, backgroundColor: '#2B3E58', borderRadius: 23, padding: 12, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#5B708E' },
  heroBoard: { width: 136, height: 136 }, heroCopy: { flex: 1, gap: 9 },
  heroTokens: { flexDirection: 'row', gap: 6, marginTop: 5 },
  heroToken: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF' },
  heroTitle: { color: '#FFF2D7', fontSize: 23, fontWeight: '900', lineHeight: 27 },
  heroHint: { color: '#D4DFEE', fontSize: 13, lineHeight: 17 },
  sectionTitle: { color: '#F7E9BA', fontSize: 15, fontWeight: '900', marginTop: 4 },
  presets: { gap: 8 },
  preset: { minHeight: 56, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#263851', borderWidth: 1, borderLeftWidth: 5, borderColor: '#4B617D' },
  presetBadge: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFFC0' },
  presetBadgeText: { color: '#263149', fontWeight: '900', fontSize: 17 },
  presetText: { flex: 1, color: '#F7F9FC', fontSize: 15, fontWeight: '700' },
  presetArrow: { color: '#F7CF78', fontSize: 27 },
  rulesToggle: { minHeight: 44, justifyContent: 'center' }, rulesTitle: { color: '#F7E9BA', fontSize: 14, fontWeight: '800' },
  rulesBody: { color: '#C1CEE0', fontSize: 13, lineHeight: 21, paddingBottom: 10 },
  game: { width: '100%', maxWidth: 560, gap: 9 },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  seat: { width: '49%', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8,
    backgroundColor: '#1B2B42', borderWidth: 1, borderRadius: 12 },
  activeSeat: { backgroundColor: '#293951' },
  seatDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#FFFFFF99' }, seatCopy: { flex: 1, minWidth: 0 },
  seatName: { color: '#F7F9FC', fontSize: 11, fontWeight: '800' }, seatProgress: { color: '#AABAD2', fontSize: 10 },
  turnCard: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11,
    backgroundColor: '#243650', borderRadius: 18, borderWidth: 1, borderColor: '#516580' },
  turnEmblem: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  turnEmblemDot: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#FFFFFFBB' },
  turnCopy: { flex: 1 }, turnTitle: { fontSize: 17, fontWeight: '900' },
  turnHint: { color: '#E3EAF3', fontSize: 12, marginTop: 2 },
  turnCount: { backgroundColor: '#152237', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  turnCountText: { color: '#E6E9EF', fontWeight: '700', fontSize: 11 },
  boardFrame: { alignSelf: 'center', padding: 5, borderRadius: 19, backgroundColor: '#C69255',
    borderWidth: 3, borderColor: '#E4B982', shadowColor: '#000000', shadowOpacity: 0.36,
    shadowOffset: { width: 0, height: 7 }, shadowRadius: 12, elevation: 8 },
  die: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F7F2E7', flexDirection: 'row', flexWrap: 'wrap', padding: 7,
    justifyContent: 'space-between', alignContent: 'space-between', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 5, elevation: 3 },
  pipSlot: { width: 7, height: 7, borderRadius: 4 }, pip: { backgroundColor: '#1C2C44' },
  dieQuestion: { color: '#1C2C44', fontSize: 24, fontWeight: '900', alignSelf: 'center', textAlign: 'center', width: '100%' },
  actionArea: { minHeight: 59, gap: 4 },
  rollButton: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 17,
    backgroundColor: '#F8CE79', borderWidth: 2, borderColor: '#FFE2A0', paddingHorizontal: 11,
    shadowColor: '#000000', shadowOpacity: 0.24, shadowOffset: { width: 0, height: 4 }, shadowRadius: 7, elevation: 4 },
  rollLabel: { flex: 1, color: '#273149', fontSize: 18, fontWeight: '900' },
  rollArrow: { color: '#273149', fontSize: 33, fontWeight: '900', lineHeight: 38 },
  waiting: { minHeight: 59, borderRadius: 16, backgroundColor: '#25364E', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  waitingText: { color: '#F8ECD0', fontWeight: '800', fontSize: 13 },
  eventText: { color: '#F7CF78', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  saveError: { color: '#FDA4AF', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primaryButton: { minHeight: 52, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7CF78' }, primaryText: { color: '#17243B', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#24334D' }, secondaryText: { color: '#FFFFFF' }, pressed: { opacity: 0.75 },
  choices: { minHeight: 59, flexDirection: 'row', justifyContent: 'center', gap: 10, paddingBottom: 4 },
  choice: { width: 58, height: 58, borderRadius: 17, backgroundColor: '#34455D', borderWidth: 2, borderColor: '#FFDB83',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  choiceDot: { width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: '#FFFFFF' },
  choiceText: { color: '#FFFFFF', fontWeight: '900' },
  modalLayer: { ...StyleSheet.absoluteFill, backgroundColor: '#030712DD', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 390, backgroundColor: '#17243B', borderRadius: 22, padding: 22, gap: 14 },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' }, modalBody: { color: '#C1CEE0', fontSize: 14, lineHeight: 21 },
});
