import { Pressable, StyleSheet, View } from 'react-native';
import { GameText as Text } from '@/shared/components/game-text';
import { isSafe, LUDO_COLORS, type LudoColor, type LudoState } from '../engine/ludoEngine';
import { SIX_HOMES, SIX_TRACK, SIX_YARDS, sixTokenCell } from './sixGeometry';
import { BOARD_THEMES, type BoardThemeId } from './themes';

export function SixPlayerBoard({ game, size, legal, boardLabel, onMove, tokenLabel, theme = 'classic' }: {
  game: LudoState; size: number; legal: number[]; boardLabel: string; onMove: (index: number) => void;
  tokenLabel: (color: LudoColor, index: number) => string; theme?: BoardThemeId;
}) {
  const unit = size / 15;
  const palette = BOARD_THEMES[theme];
  const tokens = game.seats.flatMap((seat, seatIndex) => seat.tokens.flatMap((progress, index) => progress === 84 ? [] :
    [{ color: seat.color, seat: seatIndex, index, point: sixTokenCell(seat.color, index, progress) }]));
  const selected = (seat: number, index: number) => game.phase === 'choose' && seat === game.turn && legal.includes(index);
  tokens.sort((a, b) => Number(selected(a.seat, a.index)) - Number(selected(b.seat, b.index)));
  return <View accessibilityLabel={boardLabel} testID="ludo-board" style={[styles.board, { width: size, height: size, backgroundColor: palette.paper, borderColor: palette.frame }]}>
    {LUDO_COLORS.map(color => {
      const yard = SIX_YARDS[color];
      return <View key={color} style={[styles.yard, { left: (yard[0].x - 0.5) * unit, top: (yard[0].y - 0.5) * unit,
        width: unit * 2.9, height: unit * 2.9, backgroundColor: palette.colors[color], borderColor: palette.ink }]} />;
    })}
    {SIX_TRACK.map((point, index) => <View key={`track-${index}`} style={[styles.cell, {
      left: (point.x - 0.36) * unit, top: (point.y - 0.36) * unit, width: unit * 0.72, height: unit * 0.72,
      borderRadius: palette.round ? unit : 2, borderColor: palette.ink,
      backgroundColor: index % 13 === 7 ? palette.colors[LUDO_COLORS[Math.floor(index / 13)]] : palette.paper,
    }]}>{isSafe(index, true) && <Text style={{ color: palette.ink, fontSize: unit * 0.5 }}>✦</Text>}</View>)}
    {LUDO_COLORS.flatMap(color => SIX_HOMES[color].map((point, index) => <View key={`${color}-${index}`} style={[styles.cell, {
      left: (point.x - 0.36) * unit, top: (point.y - 0.36) * unit, width: unit * 0.72, height: unit * 0.72,
      borderColor: palette.ink, backgroundColor: palette.colors[color], borderRadius: palette.round ? unit : 2,
    }]} />))}
    <View style={[styles.finish, { left: unit * 6.9, top: unit * 6.9, width: unit * 1.2, height: unit * 1.2, backgroundColor: palette.frame }]}>
      <Text style={{ color: palette.paper, fontSize: unit * 0.7 }}>★</Text>
    </View>
    {tokens.map(token => {
      const selectable = selected(token.seat, token.index);
      const stack = tokens.filter(other => other.point.x === token.point.x && other.point.y === token.point.y);
      const offset = stack.indexOf(token) * unit * 0.15;
      return <Pressable key={`${token.color}-${token.index}`} testID={`ludo-token-${token.color}-${token.index}`}
        accessibilityRole="button" accessibilityLabel={tokenLabel(token.color, token.index)} disabled={!selectable}
        accessibilityState={{ disabled: !selectable }} onPress={() => onMove(token.index)}
        style={[styles.hit, { left: token.point.x * unit - 20 + offset, top: token.point.y * unit - 20 + offset }]}>
        <View style={[styles.token, { width: unit * 0.7, height: unit * 0.7, backgroundColor: palette.colors[token.color],
          borderColor: selectable ? '#FFF39C' : palette.ink, borderWidth: selectable ? 3 : 1.5 }]} />
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  board: { alignSelf: 'center', borderWidth: 2, borderRadius: 18, overflow: 'hidden' },
  yard: { position: 'absolute', borderRadius: 100, borderWidth: 1 },
  cell: { position: 'absolute', borderWidth: 0.7, alignItems: 'center', justifyContent: 'center' },
  finish: { position: 'absolute', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  hit: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  token: { borderRadius: 100, shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
});
