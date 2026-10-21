import * as Crypto from 'expo-crypto';

import type { RandomBytes } from './vaultCrypto';

/**
 * The app's cryptographically-secure random source, backed by expo-crypto (available on web and
 * native). The crypto core takes this by injection so it can be unit-tested with node:crypto.
 */
export const randomBytes: RandomBytes = (n: number) => Crypto.getRandomBytes(n);
