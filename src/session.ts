/**
 * Whether Nazar was unlocked with the code since the app (or browser tab) started.
 * In memory only: a cold start, a reload or a deep link always lands on the calculator.
 */
let unlocked = false;

export const session = {
  isUnlocked: () => unlocked,
  unlock: () => {
    unlocked = true;
  },
  lock: () => {
    unlocked = false;
  },
};
