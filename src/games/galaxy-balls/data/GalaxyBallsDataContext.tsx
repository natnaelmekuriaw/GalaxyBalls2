import { createContext, useContext } from 'react';

import type { EngineState, GameMode } from '../engine/galaxyEngine';
import type { GalaxyBallsData } from './galaxyBallsData';

export type GalaxyBallsDataContextValue = GalaxyBallsData & {
  setColorblindGlyphs: (value: boolean) => void;
  setRotationMode: (value: GalaxyBallsData['rotationMode']) => void;
  recordHighScore: (mode: GameMode, score: number, level: number, date?: string) => void;
  saveCurrentGame: (state: EngineState) => void;
  finishGame: (state: EngineState, date?: string) => void;
  saveFailed: boolean;
};

export const GalaxyBallsDataContext = createContext<GalaxyBallsDataContextValue | null>(null);

export function useGalaxyBallsData() {
  const context = useContext(GalaxyBallsDataContext);
  if (!context) throw new Error('useGalaxyBallsData must be used inside AppDataProvider');
  return context;
}
