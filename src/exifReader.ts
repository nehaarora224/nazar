import { Platform } from 'react-native';

/** Reads the raw bytes of a local or blob URI on web or native, without uploading anything. */
export async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return new Uint8Array(await res.arrayBuffer());
  }
  // Lazy import so the web bundle never pulls the native file module.
  const { File } = await import('expo-file-system');
  const buf = await new File(uri).arrayBuffer();
  return new Uint8Array(buf);
}
