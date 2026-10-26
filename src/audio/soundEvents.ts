import type { LockResolutionSummary } from '../engine/galaxyEngine';
import type { SoundCue } from './soundController';

/** Choose one clear cue for each lock, including locks caused by either drop control. */
export function getResolutionSound(summary: LockResolutionSummary): SoundCue {
  if (summary.gameOver) return 'gameOver';
  if (summary.levelUp) return 'levelUp';
  if (summary.specialTriggered === 'BOMB') return 'bomb';
  if (summary.specialTriggered === 'FLASH') return 'flash';
  if (summary.specialTriggered === 'STAR') return 'star';
  if (summary.chainDepth >= 2) return 'cascade';
  if (summary.clearedCount > 0) return 'clear';
  return summary.stoneLanded ? 'stone' : 'land';
}
