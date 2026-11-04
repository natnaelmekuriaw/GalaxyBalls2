import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import { COLORS, cellColor, cellIsSafe, cellIsTrack, tokenCell } from './geometry';
import { FINISH, type LudoColor, type LudoState } from '../engine/ludoEngine';

type BoardToken = { color: LudoColor; seat: number; index: number; x: number; y: number; stack: number; count: number };

export function LudoBoard({ game, size, legal, boardLabel, onMove, tokenLabel }: {
  game: LudoState; size: number; legal: number[]; boardLabel: string; onMove: (index: number) => void;
  tokenLabel: (color: LudoColor, index: number) => string;
}) {
  const cell = size / 15;
  const tokens = useMemo(() => {
    const items = game.seats.flatMap((seat, seatIndex) => seat.tokens.flatMap((progress, index) => {
      if (progress === FINISH) return [];
      const point = tokenCell(seat.color, index, progress);
      return [{ color: seat.color, seat: seatIndex, index, ...point }];
    }));
    return items.map(item => {
      const matching = items.filter(other => other.x === item.x && other.y === item.y);
      return { ...item, stack: matching.indexOf(item), count: matching.length } as BoardToken;
    });
  }, [game.seats]);

  return <View testID="ludo-board" accessibilityLabel={boardLabel} style={[styles.board, { width: size, height: size }]}>
    {Array.from({ length: 15 }, (_, y) => <View key={y} style={styles.row}>
      {Array.from({ length: 15 }, (_, x) => {
        const owner = cellColor(x, y);
        const track = cellIsTrack(x, y);
        const safe = cellIsSafe(x, y);
        const center = x >= 6 && x <= 8 && y >= 6 && y <= 8;
        return <View key={x} style={[styles.cell, { width: cell, height: cell },
          owner && { backgroundColor: `${COLORS[owner]}${track ? 'D9' : '4D'}` },
          track && !owner && styles.track, center && styles.center]}>
          {safe && <Text style={[styles.safeMark, { fontSize: cell * 0.44 }]}>✦</Text>}
          {center && x === 7 && y === 7 && <Text style={[styles.centerMark, { fontSize: cell * 0.75 }]}>★</Text>}
        </View>;
      })}
    </View>)}
    {tokens.map(token => {
      const selectable = game.phase === 'choose' && token.seat === game.turn && legal.includes(token.index);
      const small = token.count > 1;
      const diameter = cell * (small ? 0.54 : 0.78);
      const slot = token.stack % 4;
      const x = token.x * cell + (small ? cell * (slot % 2 ? 0.43 : 0.04) : (cell - diameter) / 2);
      const y = token.y * cell + (small ? cell * (slot > 1 ? 0.43 : 0.04) : (cell - diameter) / 2);
      return <Pressable key={`${token.color}-${token.index}`} testID={`ludo-token-${token.color}-${token.index}`}
        accessibilityRole="button" accessibilityLabel={tokenLabel(token.color, token.index)}
        accessibilityState={{ disabled: !selectable }} disabled={!selectable}
        onPress={() => onMove(token.index)}
        style={[styles.token, { left: x, top: y, width: diameter, height: diameter, borderRadius: diameter / 2,
          backgroundColor: COLORS[token.color] }, selectable && styles.selectable]}>
        <View style={[styles.tokenDot, { width: diameter * 0.27, height: diameter * 0.27, borderRadius: diameter * 0.14 }]} />
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  board: { alignSelf: 'center', borderWidth: 2, borderColor: '#8392AE', borderRadius: 8,
    overflow: 'hidden', backgroundColor: '#172238', shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 18, elevation: 5 },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#71819A66', alignItems: 'center', justifyContent: 'center' },
  track: { backgroundColor: '#F5F3E9' },
  center: { backgroundColor: '#26334B' },
  safeMark: { color: '#1C2940', fontWeight: '900', lineHeight: 20 },
  centerMark: { color: '#F7E9A2', fontWeight: '900' },
  token: { position: 'absolute', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 2, elevation: 3 },
  selectable: { borderColor: '#FFE88B', borderWidth: 3, shadowColor: '#FFE88B', shadowOpacity: 0.95, shadowRadius: 8, elevation: 8 },
  tokenDot: { backgroundColor: '#FFFFFFBD' },
});
