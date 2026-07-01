/**
 * Compression engine: take a video URI and produce a file guaranteed under
 * Discord's free 10 MB cap, using react-native-compressor (native MediaCodec,
 * FFmpeg-free) with an estimate -> transcode -> verify -> retry loop.
 */
import { Video, getVideoMetaData, getRealPath, createVideoThumbnail } from 'react-native-compressor';
import { trim as nativeTrim } from 'react-native-video-trim';
import { planEncode, maxFitDuration, TARGET_BYTES, MAX_ATTEMPTS } from './encodePlan';

export const cancelCompression = (id: string) => Video.cancelCompression(id);

/** Trim a video to [0, endSec] and return the path of the trimmed file. */
export async function trimToFit(uri: string, targetBytes = TARGET_BYTES): Promise<string> {
  const endMs = maxFitDuration(targetBytes) * 1000;
  const result = await nativeTrim(uri, { startTime: 0, endTime: endMs });
  return result.outputPath;
}

export type CompressSuccess = {
  ok: true;
  uri: string;
  originalSize: number;
  finalSize: number;
  /** True when the source already fit and we skipped re-encoding entirely. */
  skipped: boolean;
  durationSec: number;
  /** Thumbnail path for the original clip (before compression). */
  originalThumbnail?: string;
  /** Thumbnail path for the compressed output. */
  thumbnail?: string;
};

export type CompressTooLong = {
  ok: false;
  reason: 'too_long';
  originalSize: number;
  /** Smallest output we managed; still over the cap. Offer to send anyway or trim. */
  bestUri: string;
  bestSize: number;
  durationSec: number;
  /** Max clip length that would fit the target at floor quality — offer trim-to-fit. */
  maxFitSec: number;
  /** Original URI to re-encode after trimming. */
  originalUri: string;
  /** Thumbnail path for the original clip (before compression). */
  originalThumbnail?: string;
  /** Thumbnail path for the best-effort output. */
  thumbnail?: string;
};

export type CompressResult = CompressSuccess | CompressTooLong;

export type CompressHooks = {
  /** Progress of the current encode pass, 0..1. */
  onProgress?: (progress: number) => void;
  /** Fired when a new pass starts, so the UI can show "attempt 2 of 3, ~700 kbps". */
  onStage?: (stage: { attempt: number; totalAttempts: number; targetKbps: number }) => void;
  /** Receives the native cancellation token so the caller can call cancelCompression(id). */
  onCancellationId?: (id: string) => void;
};

/** react-native-compressor's metadata map for a video file. */
type VideoMeta = { size: number; duration: number; width: number; height: number; extension: string };

async function thumb(uri: string): Promise<string | undefined> {
  try {
    const t = await createVideoThumbnail(uri, { quality: 0.6 });
    return t.path;
  } catch {
    return undefined;
  }
}

/** Resolve a content:// URI (from a share intent / picker) to a real file path the encoder can read. */
async function toRealPath(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    try {
      return await getRealPath(uri, 'video');
    } catch {
      return uri; // compressor can often handle the content URI directly as a fallback
    }
  }
  return uri;
}

export async function compressUnderLimit(
  inputUri: string,
  hooks: CompressHooks = {},
  targetBytes: number = TARGET_BYTES,
): Promise<CompressResult> {
  const realPath = await toRealPath(inputUri);
  const meta = (await getVideoMetaData(realPath)) as VideoMeta;
  const originalSize = meta.size;

  // Already small enough — don't re-encode and lose quality for nothing.
  if (originalSize <= targetBytes * 0.95) {
    const thumbnail = await thumb(realPath);
    return { ok: true, uri: realPath, originalSize, finalSize: originalSize, skipped: true, durationSec: meta.duration, thumbnail };
  }

  const originalThumbnail = await thumb(realPath);

  let best: { uri: string; size: number } | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const plan = planEncode(meta.duration, attempt, targetBytes);
    hooks.onStage?.({ attempt: attempt + 1, totalAttempts: MAX_ATTEMPTS, targetKbps: plan.videoKbps });

    const outUri = await Video.compress(
      realPath,
      {
        compressionMethod: 'manual',
        bitrate: plan.videoBitrate,
        maxSize: plan.maxSize,
        progressDivider: 5,
        getCancellationId: (id) => hooks.onCancellationId?.(id),
      },
      (progress) => hooks.onProgress?.(progress),
    );

    const outMeta = (await getVideoMetaData(outUri)) as VideoMeta;
    if (!best || outMeta.size < best.size) best = { uri: outUri, size: outMeta.size };

    if (outMeta.size <= targetBytes) {
      const thumbnail = await thumb(outUri);
      return { ok: true, uri: outUri, originalSize, finalSize: outMeta.size, skipped: false, durationSec: meta.duration, originalThumbnail, thumbnail };
    }

    // At the quality floor already — additional passes can't shrink it further.
    if (plan.atFloor) break;
  }

  const thumbnail = await thumb(best!.uri);
  return {
    ok: false,
    reason: 'too_long',
    originalSize,
    bestUri: best!.uri,
    bestSize: best!.size,
    durationSec: meta.duration,
    maxFitSec: maxFitDuration(targetBytes),
    originalUri: realPath,
    originalThumbnail,
    thumbnail,
  };
}
