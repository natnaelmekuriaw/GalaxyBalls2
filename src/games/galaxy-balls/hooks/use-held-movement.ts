import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { createHoldController, type MovementAction } from '@/games/galaxy-balls/controls/holdController';

export function useHeldMovement(enabled: boolean, actions: Record<MovementAction, () => void>) {
  const inputEnabled = useRef(enabled);
  const foreground = useRef(AppState.currentState === null || AppState.currentState === 'active');
  const [controller] = useState(() => createHoldController(() => {}));

  useLayoutEffect(() => { controller.setOnMove((action) => actions[action]()); }, [actions, controller]);
  useLayoutEffect(() => {
    inputEnabled.current = enabled;
    controller.setEnabled(enabled && foreground.current);
    return () => controller.setEnabled(false);
  }, [controller, enabled]);

  useEffect(() => {
    const changeFocus = (active: boolean) => {
      foreground.current = active;
      controller.setEnabled(active && inputEnabled.current);
    };
    const subscription = AppState.addEventListener('change', (state) => changeFocus(state === 'active'));
    const androidBlur = Platform.OS === 'android' ? AppState.addEventListener('blur', () => changeFocus(false)) : null;
    const androidFocus = Platform.OS === 'android' ? AppState.addEventListener('focus', () => changeFocus(true)) : null;
    const blur = () => changeFocus(false);
    const focus = () => changeFocus(true);
    if (Platform.OS === 'web') {
      window.addEventListener('blur', blur);
      window.addEventListener('focus', focus);
    }
    return () => {
      subscription.remove();
      androidBlur?.remove();
      androidFocus?.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('blur', blur);
        window.removeEventListener('focus', focus);
      }
      controller.setEnabled(false);
    };
  }, [controller]);

  return controller;
}
