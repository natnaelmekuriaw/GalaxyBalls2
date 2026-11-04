import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameText as Text } from '@/shared/components/game-text';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { LudoBoard } from './board/LudoBoard';
import { COLORS } from './board/geometry';
import { chooseComputerToken, createLudoGame, FINISH, legalTokens, moveLudoToken, rollLudo,
  type LudoSetup } from './engine/ludoEngine';
import { translateLudo, type LudoTranslationKey } from './i18n/translations';
import { useLudoMatch } from './data/useLudoMatch';

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
  const boardSize = Math.max(230, Math.floor(Math.min(width - 28, width > height ? height - 140 : 440)));

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
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={showMenu ? tr('backToGames') : tr('menu')}
          onPress={() => showMenu ? router.navigate('/explore') : setShowMenu(true)} style={styles.backButton}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>{tr('title')}</Text>
          <Text style={styles.subtitle}>{tr('subtitle')}</Text>
        </View>
        {!showMenu && <Pressable accessibilityRole="button" accessibilityLabel={tr('menu')} onPress={() => setShowMenu(true)} style={styles.headerMenu}>
          <Text style={styles.headerMenuText}>☰</Text>
        </Pressable>}
      </View>

      {showMenu ? <View style={styles.menu}>
        <View style={styles.hero}>
          <View style={styles.heroTokens}>{(['red', 'green', 'yellow', 'blue'] as const).map(color =>
            <View key={color} style={[styles.heroToken, { backgroundColor: COLORS[color] }]} />)}</View>
          <Text style={styles.heroTitle}>{tr('chooseMatch')}</Text>
          <Text style={styles.heroHint}>{tr('subtitle')}</Text>
        </View>
        {!ready && <Text style={styles.rulesBody}>{tr('loading')}</Text>}
        {ready && game && game.phase !== 'finished' && <PrimaryButton onPress={() => setShowMenu(false)}>{tr('resume')}</PrimaryButton>}
        {ready && <>
        <Text style={styles.sectionTitle}>{tr('computerMatches')}</Text>
        <View style={styles.presets}>{[1, 2, 3].map(count =>
          <Pressable key={`bot-${count}`} accessibilityRole="button" onPress={() => requestStart({ humans: 1, computers: count })}
            style={({ pressed }) => [styles.preset, pressed && styles.pressed]}>
            <Text style={styles.presetIcon}>♟</Text><Text style={styles.presetText}>{tr('vsBots', { count })}</Text><Text style={styles.presetArrow}>›</Text>
          </Pressable>)}</View>
        <Text style={styles.sectionTitle}>{tr('localMatches')}</Text>
        <View style={styles.presets}>{[2, 3, 4].map(count =>
          <Pressable key={`local-${count}`} accessibilityRole="button" onPress={() => requestStart({ humans: count, computers: 0 })}
            style={({ pressed }) => [styles.preset, pressed && styles.pressed]}>
            <Text style={styles.presetIcon}>●</Text><Text style={styles.presetText}>{tr('localPlayers', { count })}</Text><Text style={styles.presetArrow}>›</Text>
          </Pressable>)}</View>
        </>}
        {saveFailed && <Text accessibilityRole="alert" style={styles.saveError}>{tr('saveFailed')}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }} onPress={() => setRulesOpen(open => !open)} style={styles.rulesToggle}>
          <Text style={styles.rulesTitle}>{tr('rules')} {rulesOpen ? '⌃' : '⌄'}</Text>
        </Pressable>
        {rulesOpen && <Text style={styles.rulesBody}>{tr('rulesBody')}</Text>}
      </View> : game && active && <View style={styles.game}>
        <View style={styles.seats}>{game.seats.map((seat, index) =>
          <View key={seat.color} style={[styles.seat, { borderColor: index === game.turn ? COLORS[seat.color] : '#42516B' }]}>
            <View style={[styles.seatDot, { backgroundColor: COLORS[seat.color] }]} />
            <View style={styles.seatCopy}>
              <Text numberOfLines={1} style={styles.seatName}>{colorName(seat.color)} · {tr(seat.kind === 'computer' ? 'computer' : 'player')}</Text>
              <Text style={styles.seatProgress}>{tr('homeCount', { count: seat.tokens.filter(progress => progress === FINISH).length })}</Text>
            </View>
          </View>)}</View>
        <View style={styles.turnCard}>
          <View><Text style={[styles.turnTitle, { color: COLORS[active.color] }]}>{game.winner ? tr('win', { color: colorName(game.winner) })
            : tr('turn', { color: colorName(active.color) })}</Text>
            <Text style={styles.turnHint}>{game.winner ? tr('playAgain') : active.kind === 'computer' ? tr('waitingComputer')
              : game.phase === 'choose' ? tr('chooseToken') : game.event === 'capture' || game.event === 'home' || game.lastRoll === 6 && game.sixes > 0
                ? tr('rollAgain') : tr('roll')}</Text>
          </View>
          <Die value={game.die ?? game.lastRoll} label={tr('dieValue', { value: game.die ?? game.lastRoll ?? '—' })} />
        </View>
        {eventText && <Text accessibilityLiveRegion="polite" style={styles.eventText}>{eventText}</Text>}
        <LudoBoard game={game} size={boardSize} legal={legal} boardLabel={tr('board')} onMove={index => setGame(current => current ? moveLudoToken(current, index) : current)}
          tokenLabel={(color, index) => tr('token', { color: colorName(color), number: index + 1 })} />
        {game.phase === 'finished' ? <PrimaryButton onPress={() => setShowMenu(true)}>{tr('playAgain')}</PrimaryButton>
          : active.kind === 'human' && game.phase === 'roll' ? <PrimaryButton onPress={() => setGame(current => current ? rollLudo(current) : current)}>{tr('roll')}</PrimaryButton>
            : active.kind === 'human' && game.phase === 'choose' ? <View style={styles.choices}>
              {legal.map(index => <Pressable key={index} accessibilityRole="button"
                accessibilityLabel={tr('token', { color: colorName(active.color), number: index + 1 })}
                onPress={() => setGame(current => current ? moveLudoToken(current, index) : current)} style={styles.choice}>
                <View style={[styles.choiceDot, { backgroundColor: COLORS[active.color] }]} />
                <Text style={styles.choiceText}>{index + 1}</Text>
              </Pressable>)}
            </View> : null}
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
  screen: { flex: 1, backgroundColor: '#080F20' },
  content: { alignItems: 'center', paddingHorizontal: 14, gap: 16 },
  header: { width: '100%', maxWidth: 560, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#18243B', alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: '#F7E9BA', fontSize: 34, lineHeight: 38 },
  headerCopy: { flex: 1 }, title: { color: '#F7E9BA', fontSize: 25, fontWeight: '900' },
  subtitle: { color: '#91A4C3', fontSize: 12 },
  headerMenu: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#18243B', alignItems: 'center', justifyContent: 'center' },
  headerMenuText: { color: '#F7E9BA', fontSize: 22 },
  menu: { width: '100%', maxWidth: 560, gap: 14 },
  hero: { minHeight: 144, backgroundColor: '#17243B', borderRadius: 25, padding: 20, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#344969' },
  heroTokens: { flexDirection: 'row', gap: 7 }, heroToken: { width: 23, height: 23, borderRadius: 9, borderWidth: 2, borderColor: '#FFFFFF' },
  heroTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' }, heroHint: { color: '#AABAD2', fontSize: 13 },
  sectionTitle: { color: '#F7E9BA', fontSize: 15, fontWeight: '900', marginTop: 4 },
  presets: { gap: 8 },
  preset: { minHeight: 54, paddingHorizontal: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#17243B', borderWidth: 1, borderColor: '#344969' },
  presetIcon: { color: '#F7CF78', fontSize: 24, width: 28, textAlign: 'center' },
  presetText: { flex: 1, color: '#F7F9FC', fontSize: 15, fontWeight: '700' },
  presetArrow: { color: '#F7CF78', fontSize: 27 },
  rulesToggle: { minHeight: 44, justifyContent: 'center' }, rulesTitle: { color: '#F7E9BA', fontSize: 14, fontWeight: '800' },
  rulesBody: { color: '#C1CEE0', fontSize: 13, lineHeight: 21, paddingBottom: 10 },
  game: { width: '100%', maxWidth: 560, gap: 12 },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  seat: { width: '48%', minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9,
    backgroundColor: '#17243B', borderWidth: 1.5, borderRadius: 13 },
  seatDot: { width: 16, height: 16, borderRadius: 8 }, seatCopy: { flex: 1, minWidth: 0 },
  seatName: { color: '#F7F9FC', fontSize: 11, fontWeight: '800' }, seatProgress: { color: '#AABAD2', fontSize: 10 },
  turnCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14,
    backgroundColor: '#17243B', borderRadius: 18, borderWidth: 1, borderColor: '#344969' },
  turnTitle: { fontSize: 17, fontWeight: '900' }, turnHint: { color: '#CED8E6', fontSize: 12, marginTop: 4 },
  die: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F7F2E7', flexDirection: 'row', flexWrap: 'wrap', padding: 7,
    justifyContent: 'space-between', alignContent: 'space-between', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 5, elevation: 3 },
  pipSlot: { width: 7, height: 7, borderRadius: 4 }, pip: { backgroundColor: '#1C2C44' },
  dieQuestion: { color: '#1C2C44', fontSize: 24, fontWeight: '900', alignSelf: 'center', textAlign: 'center', width: '100%' },
  eventText: { color: '#F7CF78', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  saveError: { color: '#FDA4AF', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primaryButton: { minHeight: 52, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7CF78' }, primaryText: { color: '#17243B', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#24334D' }, secondaryText: { color: '#FFFFFF' }, pressed: { opacity: 0.75 },
  choices: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingBottom: 4 },
  choice: { width: 52, height: 52, borderRadius: 15, backgroundColor: '#24334D', borderWidth: 1, borderColor: '#536986',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  choiceDot: { width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: '#FFFFFF' },
  choiceText: { color: '#FFFFFF', fontWeight: '900' },
  modalLayer: { ...StyleSheet.absoluteFill, backgroundColor: '#030712DD', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 390, backgroundColor: '#17243B', borderRadius: 22, padding: 22, gap: 14 },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' }, modalBody: { color: '#C1CEE0', fontSize: 14, lineHeight: 21 },
});
