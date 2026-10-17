export type ScreenId = 'calculator' | 'dashboard' | 'exposure' | 'tracker' | 'bait' | 'vault' | 'plan';

export const SCREEN_ORDER: ScreenId[] = ['calculator', 'dashboard', 'exposure', 'tracker', 'bait', 'vault', 'plan'];

export type Mode = 'pitch' | 'live';

/** Props every screen receives. */
export type ScreenProps = {
  mode: Mode;
  /** Move to another screen. In pitch mode this switches to the live demo. */
  nav: (to: ScreenId) => void;
  /** Return to the calculator immediately. */
  quickExit: () => void;
  /** Show a short, polite status message. */
  toast: (msg: string) => void;
};

export type Status = 'safe' | 'look' | 'act';
