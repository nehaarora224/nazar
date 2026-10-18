import { TextStyle } from 'react-native';

/** Nazar design tokens, taken from the "Nazar Hero Screens v2" design. */
export const colors = {
  cream: '#F6F3EE',
  surface: '#FFFDF9',
  onPrimary: '#FBF9F5',
  ink: '#1F1C2E',
  muted: '#5A5650',
  hairline: 'rgba(31,28,46,0.06)',
  border: 'rgba(46,38,112,0.12)',

  primary: '#4B3FA0',
  primaryHover: '#3D3290',
  primaryDeep: '#362C80',
  primaryNight: '#2E2670',
  lavender: '#ECE8F7',
  lavenderSoft: '#EFECF9',
  lavenderPill: '#E3DEF4',
  lavenderPillPressed: '#CFC6EC',
  langTrack: '#E6E1F3',
  statTile: '#F2EFFA',
  statAlert: '#F8ECE8',
  warmRow: '#FBF6EF',
  neutralBg: '#F1EEE8',
  neutralFg: '#4A463F',

  teal: '#4FA9A1',
  tealDeep: '#3E8A82',

  safe: '#5E9A78',
  safeBg: '#E4F0E7',
  safeFg: '#2F5E44',
  safeIcon: '#3E7A59',
  safeLine: '#A9CDB7',

  look: '#C98F3A',
  lookBg: '#F8EDD8',
  lookFg: '#77511A',
  lookIcon: '#A06F25',

  act: '#C0675A',
  actBg: '#F6E3DF',
  actFg: '#8A3F35',

  off: '#B5B0A8',
  offBg: '#EFEBE4',
  offIconBg: '#F1EFEA',
  checkOff: '#A8A39B',
};

export type Tone = 'safe' | 'look' | 'act' | 'off';

export const tone: Record<Tone, { dot: string; bg: string; fg: string; halo: string }> = {
  safe: { dot: colors.safe, bg: colors.safeBg, fg: colors.safeFg, halo: 'rgba(94,154,120,0.18)' },
  look: { dot: colors.look, bg: colors.lookBg, fg: colors.lookFg, halo: 'rgba(201,143,58,0.20)' },
  act: { dot: colors.act, bg: colors.actBg, fg: colors.actFg, halo: 'rgba(192,103,90,0.18)' },
  off: { dot: colors.checkOff, bg: colors.neutralBg, fg: colors.neutralFg, halo: 'rgba(181,176,168,0.2)' },
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

/** Text presets. Body text never drops below 15, pills/tags never below 13. */
export const type = {
  display: { fontFamily: fonts.medium, fontSize: 28, lineHeight: 32, letterSpacing: -0.56, color: colors.ink },
  title: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22, color: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted },
  bodyInk: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.ink },
  pill: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.78,
    textTransform: 'uppercase',
    color: colors.muted,
  },
} satisfies Record<string, TextStyle>;

export const shadow = {
  /** The Home design's card lift: a hairline plus a long soft shadow. */
  card: '0px 1px 0px rgba(46,38,112,0.04), 0px 18px 36px -24px rgba(46,38,112,0.40)',
  soft: '0px 1px 0px rgba(46,38,112,0.04), 0px 12px 28px -22px rgba(46,38,112,0.35)',
  button: '0px 14px 28px -12px rgba(75,63,160,0.6)',
};

/** Screen wash from the Home design: lavender at the top fading into cream. */
export const screenWash = 'linear-gradient(180deg, #EEEAF7 0%, #F6F3EE 34%)';

/** Spacing scale (dp). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
/** Corner radii: chips, controls, cards. */
export const radius = { sm: 14, md: 16, lg: 22, pill: 999 };
/** Minimum tap target. */
export const TAP = 44;
