/** Output handling: re-share the compressed file (Share sheet -> Discord) and save a copy to the gallery. */
import Share from 'react-native-share';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

/** react-native-share / CameraRoll want a file:// URI on Android; the encoder may hand back a bare path. */
export function ensureFileUri(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

/** Open the system Share sheet with the compressed video so the user can pick Discord. */
export async function sendToDiscord(uri: string): Promise<'shared' | 'dismissed'> {
  try {
    await Share.open({
      url: ensureFileUri(uri),
      type: 'video/mp4',
      failOnCancel: false,
    });
    return 'shared';
  } catch {
    // failOnCancel:false still rejects on some platforms when dismissed — treat as a no-op.
    return 'dismissed';
  }
}

/** Share one or more compressed videos through a single Share sheet (Discord accepts
 * multiple files at once). Falls back to the single-file form for one URI. */
export async function sendMultipleToDiscord(uris: string[]): Promise<'shared' | 'dismissed'> {
  const files = uris.map(ensureFileUri);
  if (files.length === 0) return 'dismissed';
  if (files.length === 1) return sendToDiscord(uris[0]);
  try {
    await Share.open({
      urls: files,
      type: 'video/mp4',
      failOnCancel: false,
    });
    return 'shared';
  } catch {
    return 'dismissed';
  }
}

/** Save the compressed file to the device gallery. Returns false if it couldn't be saved. */
export async function saveCopy(uri: string): Promise<boolean> {
  try {
    await CameraRoll.saveAsset(ensureFileUri(uri), { type: 'video' });
    return true;
  } catch {
    return false;
  }
}
