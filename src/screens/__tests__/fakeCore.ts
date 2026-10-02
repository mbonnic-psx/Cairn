/**
 * A fake of Cairn's core at the one seam the interface calls it through.
 *
 * `@tauri-apps/api/core`'s `invoke(cmd, args)` returns
 * `window.__TAURI_INTERNALS__.invoke(cmd, args, options)` and does nothing else
 * (2.11.1, core.js:201). Installing an object there stands in for the core
 * with no mocking framework: each command answers from a plain function, and
 * every call is recorded.
 */
export type Answer = (args: Record<string, unknown>) => unknown;

export interface FakeCore {
  /** Every command asked, in order, with its arguments. */
  calls: { cmd: string; args: Record<string, unknown> }[];
  /** Remove the fake, leaving the window as it was. */
  remove: () => void;
}

type Internals = {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};
type WithInternals = { __TAURI_INTERNALS__?: Internals };

/** A promise that never settles: a core that has not answered yet. */
export const never = () => new Promise<never>(() => undefined);

export function installFakeCore(answers: Record<string, Answer>): FakeCore {
  const host = window as unknown as WithInternals;
  const before = host.__TAURI_INTERNALS__;
  const calls: FakeCore['calls'] = [];
  host.__TAURI_INTERNALS__ = {
    invoke: (cmd, args = {}) => {
      calls.push({ cmd, args });
      const answer = answers[cmd];
      if (!answer) return Promise.reject(`no answer for ${cmd}`);
      try {
        return Promise.resolve(answer(args));
      } catch (problem) {
        return Promise.reject(problem);
      }
    },
  };
  return {
    calls,
    remove: () => {
      if (before === undefined) delete host.__TAURI_INTERNALS__;
      else host.__TAURI_INTERNALS__ = before;
    },
  };
}
