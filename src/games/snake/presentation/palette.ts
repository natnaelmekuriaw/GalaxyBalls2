export type SnakePalette = {
  readonly head: string;
  readonly body: readonly string[];
  readonly accent: string;
};

const PALETTES: readonly SnakePalette[] = [
  { head: '#C8FF7A', body: ['#B8F779', '#A5E974', '#8FDB79', '#75CC7B', '#5CBA7A'], accent: '#C8FF7A' },
  { head: '#AEFFC1', body: ['#A2F3B4', '#8CE6AC', '#76D8A4', '#64C99A', '#56BA90'], accent: '#AEFFC1' },
  { head: '#9AF6DF', body: ['#8AEBD4', '#78DDC7', '#69CFBC', '#5EC0AF', '#53B0A3'], accent: '#9AF6DF' },
  { head: '#ADEBFF', body: ['#9ADDF5', '#88CEE9', '#79BEDB', '#6DAECE', '#619FC0'], accent: '#ADEBFF' },
  { head: '#DDCEFF', body: ['#CFBEF4', '#C1AEE8', '#B49EDB', '#A68FD0', '#9982C3'], accent: '#DDCEFF' },
];

/** The run's existing level restores its color without storing another preference. */
export function getSnakePalette(level: number): SnakePalette {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return PALETTES[(safeLevel - 1) % PALETTES.length];
}
