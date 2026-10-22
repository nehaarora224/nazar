import { CameraView } from 'expo-camera';
import { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { Attachment } from '../store';

/**
 * Takes ONE silent front-camera photo after repeated wrong-PIN attempts, then reports it so the
 * store can save it (encrypted) to the Vault. Native only: on web — and any non-Android platform —
 * this renders nothing and never touches the camera, so the calculator disguise and the web build
 * are unaffected. The view is mounted off-screen (1×1, invisible) only while `armed`, so the camera
 * is active for just the moment it takes to capture. Every failure is swallowed: a capture must
 * never break the unlock flow.
 */
export function IntruderCamera({ armed, onCapture, onDone }: { armed: boolean; onCapture: (a: Attachment) => void; onDone: () => void }) {
  const ref = useRef<CameraView>(null);
  const busy = useRef(false);
  if (Platform.OS !== 'android' || !armed) return null;

  const capture = async () => {
    if (busy.current || !ref.current) return;
    busy.current = true;
    try {
      const pic = await ref.current.takePictureAsync({ base64: true, quality: 0.4, skipProcessing: true, shutterSound: false });
      if (pic?.base64) {
        const size = Math.floor(pic.base64.length * 0.75);
        onCapture({ mime: 'image/jpeg', dataUrl: `data:image/jpeg;base64,${pic.base64}`, size });
      }
    } catch {
      // ignore — the disguise and unlock must keep working even if the camera fails
    } finally {
      onDone();
    }
  };

  return (
    <View style={styles.hidden} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <CameraView ref={ref} style={StyleSheet.absoluteFill} facing="front" animateShutter={false} onCameraReady={capture} />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, left: -100, top: -100, opacity: 0 },
});
