import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { Attachment } from './store';

/** Largest attachment we keep: it is base64-embedded in the encrypted vault blob, so keep it small. */
export const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;

export type PickResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; reason: 'canceled' | 'denied' | 'tooBig' | 'failed' };

/**
 * Let the person attach ONE screenshot/photo to an evidence record. The bytes are read into a
 * base64 data URL and stored INSIDE the encrypted vault — never copied to public or app-world-
 * readable storage, and never uploaded. Images are re-encoded at reduced quality to stay small.
 */
export async function pickImageAttachment(): Promise<PickResult> {
  try {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied' };
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.6,
      base64: true,
    });
    if (res.canceled || !res.assets?.length) return { ok: false, reason: 'canceled' };
    const a = res.assets[0];
    if (!a.base64) return { ok: false, reason: 'failed' };
    const mime = a.mimeType ?? 'image/jpeg';
    // base64 length → ~bytes; also respect the picker's own fileSize when present.
    const bytes = a.fileSize ?? Math.floor(a.base64.length * 0.75);
    if (bytes > MAX_ATTACHMENT_BYTES) return { ok: false, reason: 'tooBig' };
    return {
      ok: true,
      attachment: { name: a.fileName ?? undefined, mime, size: bytes, dataUrl: `data:${mime};base64,${a.base64}` },
    };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
