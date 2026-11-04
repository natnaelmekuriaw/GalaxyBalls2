import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { LudoState } from '../engine/ludoEngine';
import { LUDO_SAVE_KEY, parseLudoSave } from './ludoSave';

export function useLudoMatch(): { game: LudoState | null; setGame: Dispatch<SetStateAction<LudoState | null>>;
  ready: boolean; saveFailed: boolean } {
  const [game, setGame] = useState<LudoState | null>(null);
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LUDO_SAVE_KEY).then(raw => {
      if (active) setGame(parseLudoSave(raw));
    }).catch(() => { if (active) setSaveFailed(true); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !game) return;
    const snapshot = JSON.stringify(game);
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(LUDO_SAVE_KEY, snapshot))
      .then(() => setSaveFailed(false))
      .catch(() => setSaveFailed(true));
  }, [game, ready]);

  return { game, setGame, ready, saveFailed };
}
