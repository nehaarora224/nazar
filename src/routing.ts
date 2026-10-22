import type { LoadStatus } from './store';

/**
 * Which top-level screen to show at the app root, decided purely from the store's load status.
 * This replaces the old "show the calculator immediately and reveal PIN setup by typing a code"
 * approach, which raced the async storage read (so the code sometimes did nothing) and layered the
 * PIN screen as an overlay on the live calculator (so its buttons could be swallowed on Android).
 *
 *   loading     → a neutral splash, so nothing is shown (or tappable) before we know if a vault exists.
 *   setup       → first launch, no vault yet → the Welcome + Create-PIN onboarding.
 *   locked/ready/error → the calculator/decoy, where the existing PIN unlocks the Vault.
 */
export type RootScreen = 'loading' | 'onboarding' | 'calculator';

export function rootScreen(status: LoadStatus): RootScreen {
  if (status === 'loading') return 'loading';
  if (status === 'setup') return 'onboarding';
  return 'calculator';
}
