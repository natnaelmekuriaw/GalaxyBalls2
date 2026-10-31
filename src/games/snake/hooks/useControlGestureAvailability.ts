import { useLayoutEffect } from 'react';
import { AppState, Platform } from 'react-native';

export function useControlGestureAvailability(controller: { setActive: (active: boolean) => void }) {
  useLayoutEffect(() => {
    const foreground = () => AppState.currentState === null || AppState.currentState === 'active';
    const activate = () => controller.setActive(foreground());
    const deactivate = () => controller.setActive(false);
    const visibility = () => document.hidden ? deactivate() : activate();
    activate();
    const change = AppState.addEventListener('change', state => controller.setActive(state === 'active'));
    const blur = Platform.OS === 'android' ? AppState.addEventListener('blur', deactivate) : null;
    const focus = Platform.OS === 'android' ? AppState.addEventListener('focus', activate) : null;
    if (Platform.OS === 'web') {
      if (document.hidden) deactivate();
      window.addEventListener('blur', deactivate);
      window.addEventListener('focus', activate);
      document.addEventListener('visibilitychange', visibility);
    }
    return () => {
      deactivate(); change.remove(); blur?.remove(); focus?.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('blur', deactivate);
        window.removeEventListener('focus', activate);
        document.removeEventListener('visibilitychange', visibility);
      }
    };
  }, [controller]);
}
