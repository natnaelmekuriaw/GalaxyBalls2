import type { LockResolutionSummary } from '../engine/galaxyEngine';
import type { TranslationKey } from '../../../shared/i18n/translations';

type Message = { key: TranslationKey; values?: Record<string, string | number> };
export type ResolutionFeedback = {
  titles: Message[];
  detail: Message;
  scope?: Message;
  color: string;
  icon: string;
};

/** Keep simultaneous outcomes together instead of hiding a level-up behind a special. */
export function getResolutionFeedback(summary: LockResolutionSummary, level: number): ResolutionFeedback | null {
  const titles: Message[] = [];
  let color = '#86EFAC';
  let icon = '✦';
  let scope: Message | undefined;
  if (summary.specialTriggered === 'BOMB') {
    titles.push({ key: 'bombBlast' });
    scope = { key: 'bombScope' };
    color = '#FB923C'; icon = '💣';
  } else if (summary.specialTriggered === 'FLASH') {
    titles.push({ key: 'flashBlast' });
    scope = { key: 'flashScope' };
    color = '#67E8F9'; icon = '⚡';
  } else if (summary.specialTriggered === 'STAR') {
    titles.push({ key: 'starBlast' });
    scope = { key: 'starScope' };
    color = '#FDE047'; icon = '⭐';
  }
  if (summary.chainDepth >= 2) {
    titles.push({ key: 'cascade', values: { count: summary.chainDepth } });
    if (!summary.specialTriggered) color = '#C4B5FD';
  }
  if (summary.levelUp) titles.push({ key: 'levelUp', values: { level } });
  if (!titles.length && summary.clearedCount > 0) titles.push({ key: 'matchClear' });
  if (!titles.length) return null;
  const detail: Message = summary.clearedCount > 0
    ? { key: 'clearedBlocks', values: { count: summary.clearedCount, points: summary.scoreDelta } }
    : { key: summary.specialTriggered === 'STAR' ? 'starNoTarget' : 'noBlocksCleared' };
  return { titles, detail, scope: summary.clearedCount > 0 ? scope : undefined, color, icon };
}

export function getLevelProgress(score: number, level: number, target: number) {
  const points = Math.max(0, Math.min(target, score - (level - 1) * target));
  return { points, target, fraction: points / target };
}
