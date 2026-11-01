export type SnakeOrientation = 'AUTO' | 'PORTRAIT' | 'LANDSCAPE';
export type SnakeOrientationState = { requested: SnakeOrientation; busy: boolean; unavailable: boolean };

export interface OrientationAdapter<Snapshot> {
  capture(): Promise<Snapshot>;
  supports(mode: SnakeOrientation): Promise<boolean>;
  apply(mode: SnakeOrientation): Promise<void>;
  restore(snapshot: Snapshot): Promise<void>;
}

export const initialOrientationState = (): SnakeOrientationState => ({ requested: 'AUTO', busy: false, unavailable: false });

/** One queue keeps a departing screen's restore ahead of the next screen's requests. */
export function createOrientationManager<Snapshot>(adapter: OrientationAdapter<Snapshot>) {
  let pending = Promise.resolve();
  function enqueue<Result>(task: () => Promise<Result>): Promise<Result> {
    const result = pending.then(task);
    pending = result.then(() => {}, () => {});
    return result;
  }

  return {
    createSession(notify: (state: SnakeOrientationState) => void) {
      type Visit = { closed: boolean; request: number; snapshot?: Snapshot; captured: boolean; changed: boolean };
      let visit: Visit | undefined;
      let state = initialOrientationState();
      const update = (current: Visit, patch: Partial<SnakeOrientationState>) => {
        if (visit !== current || current.closed) return;
        state = { ...state, ...patch };
        notify(state);
      };
      const leave = () => {
        const previous = visit;
        if (!previous) return;
        previous.closed = true;
        visit = undefined;
        void enqueue(async () => {
          if (!previous.changed || !previous.captured) return;
          try { await adapter.restore(previous.snapshot as Snapshot); } catch { /* Native cleanup must not block navigation. */ }
        });
      };
      return {
        enter() {
          leave();
          const current: Visit = { closed: false, request: 0, captured: false, changed: false };
          visit = current;
          state = initialOrientationState();
          notify(state);
          void enqueue(async () => {
            if (current.closed) return;
            try {
              current.snapshot = await adapter.capture();
              current.captured = true;
            } catch {
              update(current, { unavailable: true });
            }
          });
        },
        changeOrientation(mode: SnakeOrientation): Promise<boolean> {
          const current = visit;
          if (!current || current.closed) return Promise.resolve(false);
          const request = ++current.request;
          update(current, { busy: true, unavailable: false });
          return enqueue(async () => {
            const latest = () => !current.closed && visit === current && current.request === request;
            if (!latest()) return false;
            try {
              if (!current.captured || !await adapter.supports(mode)) {
                if (latest()) update(current, { busy: false, unavailable: true });
                return false;
              }
              if (!latest()) return false;
              // An API may apply its lock before rejecting, so cleanup still restores it.
              current.changed = true;
              await adapter.apply(mode);
              if (!latest()) return false;
              update(current, { requested: mode, busy: false, unavailable: false });
              return true;
            } catch {
              if (latest()) update(current, { busy: false, unavailable: true });
              return false;
            }
          });
        },
        leave,
      };
    },
    settled: () => pending,
  };
}
