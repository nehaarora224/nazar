/**
 * The device pepper: a random secret that lives in the platform's hardware-backed keystore and is
 * mixed into the PIN key-derivation (see vaultCrypto.ts). Its purpose is to make OFFLINE brute force
 * of a short numeric PIN infeasible — without the keystore secret, an exfiltrated vault blob cannot
 * be attacked at all, no matter how small the PIN's keyspace.
 *
 * STATUS — not yet active. A hardware-backed keystore needs a native module (expo-secure-store on
 * iOS Keychain / Android Keystore). That requires a development build, which this environment
 * cannot produce or verify, so no pepper is used today and this function returns null. The crypto
 * is still real (PIN-derived AES-256-GCM, scrypt-hardened), but until the pepper is wired up a short
 * PIN is only as strong as scrypt makes each guess. We do NOT fake a keystore with ordinary storage,
 * because a pepper kept next to the ciphertext it protects would add no security — that would be
 * substituting insecure storage and calling it secure.
 *
 * MINIMUM NEXT STEP (native dev build):
 *   1. `npx expo install expo-secure-store`
 *   2. On first PIN creation, mint 32 random bytes and store them under a fixed key with
 *      SecureStore.setItemAsync(KEY, hex, { keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }).
 *   3. Return those bytes here. Re-wrapping existing vaults to add the pepper is a one-time
 *      rewrapPin()-style migration done the next time the user enters their PIN.
 */
export async function getDevicePepper(): Promise<Uint8Array | null> {
  return null;
}

/** True once a hardware-backed pepper is actually protecting the vault. Surfaced in the UI honestly. */
export const devicePepperActive = false;
