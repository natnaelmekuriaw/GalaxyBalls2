import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import { HOME_LANES, YARDS, cellColor, cellIsSafe, cellIsTrack, tokenCell } from './geometry';
import { FINISH, LUDO_COLORS, type LudoColor, type LudoState } from '../engine/ludoEngine';

import { BOARD_THEMES, type BoardThemeId } from './themes';
import { SixPlayerBoard } from './SixPlayerBoard';

type BoardToken = { color: LudoColor; seat: number; index: number; x: number; y: number; stack: number; count: number };
const YARD_ORIGINS: Record<LudoColor, { x: number; y: number }> = {
  red: { x: 0, y: 0 }, green: { x: 9, y: 0 }, blue: { x: 0, y: 9 }, yellow: { x: 9, y: 9 }, purple: { x: 0, y: 0 }, orange: { x: 0, y: 0 },
};

type BoardProps = {
  theme?: BoardThemeId;
  game: LudoState; size: number; legal: number[]; boardLabel: string; onMove: (index: number) => void;
  tokenLabel: (color: LudoColor, index: number) => string;
};
export function LudoBoard(props: BoardProps) {
  return props.game.seats.length > 4 ? <SixPlayerBoard {...props} /> : <ClassicBoard {...props} />;
}
function ClassicBoard({ game, size, legal, boardLabel, onMove, tokenLabel, theme = 'classic' }: BoardProps) {
  const palette = BOARD_THEMES[theme];
  const COLORS = palette.colors;
  const cell = size / 15;
  const tokens = useMemo(() => {
    const items = game.seats.flatMap((seat, seatIndex) => seat.tokens.flatMap((progress, index) => {
      if (progress === FINISH) return [];
      return [{ color: seat.color, seat: seatIndex, index, ...tokenCell(seat.color, index, progress) }];
    }));
    return items.map(item => {
      const matching = items.filter(other => other.x === item.x && other.y === item.y);
      return { ...item, stack: matching.indexOf(item), count: matching.length } as BoardToken;
    });
  }, [game.seats]);
  const current = game.seats[game.turn];
  const targets = game.phase === 'choose' ? legal.map(index => {
    const progress = current.tokens[index];
    return tokenCell(current.color, index, progress === -1 ? 0 : progress + (game.die ?? 0));
  }) : [];
  const isSelectable = (token: BoardToken) => game.phase === 'choose' && token.seat === game.turn && legal.includes(token.index);
  const orderedTokens = [...tokens].sort((left, right) => Number(isSelectable(left)) - Number(isSelectable(right)));

  return <View testID="ludo-board" accessibilityLabel={boardLabel} style={[styles.board, { width: size, height: size, borderRadius: palette.flat ? 0 : cell * 0.55, borderColor: palette.frame }]}>
    {Array.from({ length: 15 }, (_, y) => <View key={y} style={styles.row}>
      {Array.from({ length: 15 }, (_, x) => {
        const owner = cellColor(x, y);
        const track = cellIsTrack(x, y);
        const safe = cellIsSafe(x, y);
        const lane = owner && HOME_LANES[owner].some(point => point.x === x && point.y === y);
        const center = x >= 6 && x <= 8 && y >= 6 && y <= 8;
        return <View key={x} style={[styles.cell, { width: cell, height: cell },
          owner && !track && !lane && !center && { backgroundColor: COLORS[owner], borderColor: COLORS[owner] },
          track && styles.track, { backgroundColor: owner ? COLORS[owner] : palette.paper, borderColor: palette.ink }, (lane || track && owner) && { backgroundColor: COLORS[owner!], borderColor: palette.ink },
          center && styles.center, owner && !track && !lane && !center && { borderColor: COLORS[owner] }, palette.round && { borderRadius: cell / 2 }]}>
          {safe && <Text style={[styles.safeMark, { fontSize: cell * 0.48, lineHeight: cell * 0.78 }]}>✦</Text>}
        </View>;
      })}
    </View>)}
    {LUDO_COLORS.slice(0, 4).map(color => {
      const origin = YARD_ORIGINS[color];
      return <View key={color} pointerEvents="none" style={[styles.yardInset, {
        left: (origin.x + 0.62) * cell, top: (origin.y + 0.62) * cell,
        width: 4.76 * cell, height: 4.76 * cell, borderRadius: palette.round ? cell * 2 : 0, backgroundColor: palette.inset, borderColor: palette.ink,
      }]}>
        {(theme === 'garden' || theme === 'jewel') && <View pointerEvents="none" aria-hidden style={{ ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: palette.ink, opacity: 0.45, fontSize: cell * 2.2 }}>{theme === 'garden' ? '❀' : '◇'}</Text>
        </View>}
        {YARDS[color].map((point, index) => <View key={index} style={[styles.yardSocket, {
          left: (point.x - origin.x - 0.62) * cell - cell * 0.12,
          top: (point.y - origin.y - 0.62) * cell - cell * 0.12,
          width: cell * 1.24, height: cell * 1.24, borderRadius: cell * 0.62,
          borderColor: `${COLORS[color]}90`, backgroundColor: `${COLORS[color]}27`,
        }]} />)}
      </View>;
    })}
    <View pointerEvents="none" style={{ position: 'absolute', left: cell * 6, top: cell * 6, width: 0, height: 0,
      borderLeftWidth: cell * 1.5, borderRightWidth: cell * 1.5, borderTopWidth: cell * 1.5, borderBottomWidth: cell * 1.5,
      borderLeftColor: COLORS.red, borderTopColor: COLORS.green, borderRightColor: COLORS.yellow, borderBottomColor: COLORS.blue,
    }} />
    {targets.map((point, index) => <View key={`target-${index}`} pointerEvents="none" style={[styles.target, {
      left: point.x * cell + cell * 0.2, top: point.y * cell + cell * 0.2,
      width: cell * 0.6, height: cell * 0.6, borderRadius: cell * 0.3,
      borderColor: COLORS[current.color],
    }]} />)}
    {orderedTokens.map(token => {
      const selectable = isSelectable(token);
      const small = token.count > 1;
      const diameter = cell * (small ? 0.68 : 0.94);
      const slot = token.stack % 4;
      const x = token.x * cell + (small ? cell * (slot % 2 ? 0.32 : 0.01) : (cell - diameter) / 2);
      const y = token.y * cell + (small ? cell * (slot > 1 ? 0.32 : 0.01) : (cell - diameter) / 2);
      const hit = Math.max(cell * 1.28, 40);
      return <Pressable key={`${token.color}-${token.index}`} testID={`ludo-token-${token.color}-${token.index}`}
        accessibilityRole="button" accessibilityLabel={tokenLabel(token.color, token.index)}
        accessibilityState={{ disabled: !selectable }} disabled={!selectable}
        onPress={() => onMove(token.index)}
        style={({ pressed }) => [styles.tokenHit, { left: x - (hit - diameter) / 2, top: y - (hit - diameter) / 2,
          width: hit, height: hit }, pressed && styles.tokenPressed]}>
        {!palette.flat && <View style={[styles.tokenShadow, { width: diameter, height: diameter * 0.85, borderRadius: diameter / 2 }]} />}
        <View style={[styles.token, { width: diameter, height: diameter, borderRadius: diameter / 2,
          backgroundColor: COLORS[token.color], borderColor: palette.ink, shadowOpacity: palette.flat ? 0 : 0.55 }, selectable && styles.selectable]}>
          {!palette.flat && <View style={[styles.tokenShine, { width: diameter * 0.56, height: diameter * 0.27, borderRadius: diameter * 0.28 }]} />}
          {!palette.flat && <View style={[styles.tokenCore, { width: diameter * 0.43, height: diameter * 0.43, borderRadius: diameter * 0.22 }]} />}
        </View>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  board: { alignSelf: 'center', overflow: 'hidden', backgroundColor: '#FFFAEE',
    borderWidth: 3, borderColor: '#F8EAD0', shadowColor: '#000000', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 9 }, shadowRadius: 16, elevation: 9 },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#D9D0BE', alignItems: 'center', justifyContent: 'center' },
  track: { backgroundColor: '#FFFCF5' }, center: { backgroundColor: '#FFFAEE', borderColor: '#FFFAEE' },
  safeMark: { color: '#243B53', fontWeight: '900', textAlign: 'center' },
  yardInset: { position: 'absolute', backgroundColor: '#FFFCF6', borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#233047', shadowOpacity: 0.22, shadowRadius: 5, elevation: 2 },
  yardSocket: { position: 'absolute', borderWidth: 2 },
  centerDiamond: { position: 'absolute', transform: [{ rotate: '45deg' }], overflow: 'hidden',
    borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  centerQuarter: { position: 'absolute' }, centerDot: { position: 'absolute', width: '25%', height: '25%',
    left: '37.5%', top: '37.5%', borderRadius: 99, backgroundColor: '#FFF9E9', borderWidth: 1, borderColor: '#B8A98A' },
  target: { position: 'absolute', borderWidth: 2.5, backgroundColor: '#FFFFFFAA' },
  tokenHit: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  tokenPressed: { transform: [{ scale: 0.88 }] },
  tokenShadow: { position: 'absolute', top: '23%', backgroundColor: '#26304788' },
  token: { borderWidth: 2, borderColor: '#FFFDF8', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#17202D', shadowOpacity: 0.55, shadowOffset: { width: 0, height: 3 }, shadowRadius: 3, elevation: 5 },
  selectable: { borderColor: '#FFE685', borderWidth: 3, shadowColor: '#FFE685', shadowOpacity: 1, shadowRadius: 8, elevation: 10 },
  tokenShine: { position: 'absolute', top: '12%', backgroundColor: '#FFFFFF99' },
  tokenCore: { backgroundColor: '#FFFFFFCC', borderWidth: 1, borderColor: '#FFFFFF' },
});
