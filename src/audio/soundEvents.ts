import type { LockResolutionSummary } from '../engine/galaxyEngine';
import type { SoundCue } from './soundController';

/** Keep a successful match audible even when it also advances a level or ends a run. */
export function getResolutionSounds(summary: LockResolutionSummary): SoundCue[] {
  const cues: SoundCue[] = [];
  if (summary.specialTriggered === 'BOMB') cues.push('bomb');
  if (summary.specialTriggered === 'FLASH') cues.push('flash');
  if (summary.specialTriggered === 'STAR') cues.push('star');
  if (summary.chainDepth >= 2) cues.push('cascade');
  else if (summary.chainDepth > 0 || (!summary.specialTriggered && summary.clearedCount > 0)) cues.push('clear');
  if (cues.length === 0 && !summary.levelUp && !summary.gameOver) {
    cues.push(summary.stoneLanded ? 'stone' : 'land');
  }
  if (summary.levelUp && !summary.gameOver) cues.push('win');
  if (summary.gameOver) cues.push('gameOver');
  return cues;
}
