import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PREFERENCES, LUDO_PREFERENCES_KEY, parsePreferences } from './preferences';
export function useLudoPreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LUDO_PREFERENCES_KEY).then(raw => { if (active) setPreferences(parsePreferences(raw)); })
      .catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(LUDO_PREFERENCES_KEY, JSON.stringify(preferences)))
      .then(() => setFailed(false)).catch(() => setFailed(true));
  }, [preferences, ready]);
  return { preferences, setPreferences, ready, failed };
}
