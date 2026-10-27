export type MovementAction = 'left' | 'down' | 'right';
export const HOLD_DELAY_MS = 280;
export const REPEAT_INTERVAL_MS = 80;

type Timer = ReturnType<typeof setTimeout>;
type Scheduler = { set: (callback: () => void, delay: number) => Timer; clear: (timer: Timer) => void };

/** Starts after Pressable recognizes a long press; taps keep their normal action. */
export function createHoldController(onMove: (action: MovementAction) => void, scheduler: Scheduler = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: (timer) => clearTimeout(timer),
}) {
  let enabled = false;
  let active: MovementAction | null = null;
  let timer: Timer | undefined;
  let generation = 0;
  const stop = (action?: MovementAction) => {
    if (action && active !== action) return;
    generation++;
    active = null;
    if (timer !== undefined) scheduler.clear(timer);
    timer = undefined;
  };
  return {
    stop,
    setOnMove(callback: (action: MovementAction) => void) { onMove = callback; },
    setEnabled(value: boolean) {
      enabled = value;
      if (!enabled) stop();
    },
    start(action: MovementAction) {
      stop();
      if (!enabled) return;
      active = action;
      const current = generation;
      const repeat = () => {
        if (!enabled || active !== action || current !== generation) return;
        timer = undefined;
        onMove(action);
        if (enabled && active === action && current === generation) {
          timer = scheduler.set(repeat, REPEAT_INTERVAL_MS);
        }
      };
      repeat();
    },
  };
}
