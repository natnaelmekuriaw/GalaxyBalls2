type Schedule = (callback: () => void, delay: number) => () => void;

const scheduleTimeout: Schedule = (callback, delay) => {
  const timer = setTimeout(callback, delay);
  return () => clearTimeout(timer);
};

/** Cancelling also invalidates callbacks that have already entered the event queue. */
export function createSnakeCountdown(schedule: Schedule = scheduleTimeout) {
  let generation = 0;
  let cancelTimer: (() => void) | null = null;

  const cancel = () => {
    generation++;
    cancelTimer?.();
    cancelTimer = null;
  };

  return {
    cancel,
    start(onStep: (remaining: number) => void, onComplete: () => void) {
      cancel();
      const started = generation;
      let remaining = 3;
      const tick = () => {
        if (started !== generation) return;
        cancelTimer = null;
        remaining--;
        if (remaining === 0) {
          generation++;
          onComplete();
          return;
        }
        onStep(remaining);
        if (started === generation) cancelTimer = schedule(tick, 700);
      };

      onStep(remaining);
      if (started === generation) cancelTimer = schedule(tick, 700);
    },
  };
}
