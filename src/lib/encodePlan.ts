/**
 * Pure bitrate-planning math for fitting a video under Discord's free upload cap.
 *
 * This file intentionally has NO native imports so it can be unit-tested in plain
 * Node/Jest. The orchestration that actually drives react-native-compressor lives
 * in ./compress.ts and consumes planEncode() from here.
 */

/** Discord free per-file limit (lowered from 25 MB to 10 MB in late 2024). */
export const TARGET_BYTES = 10 * 1024 * 1024;

/** Aim a little under the cap so container overhead / encoder variance never pushes us over. */
export const SAFETY = 0.92;

/** Bitrate we reserve for the audio track when budgeting video bits (kbps). */
export const RESERVED_AUDIO_KBPS = 128;

/** Lowest video bitrate we'll attempt before declaring a clip "too long to fit" (kbps). */
export const FLOOR_VIDEO_KBPS = 350;

/** A single encode is a guess; we verify the real output size and retry lower up to this many times. */
export const MAX_ATTEMPTS = 3;

/** Each retry multiplies the target bitrate by this to recover from an overshoot. */
export const RETRY_BACKOFF = 0.8;

export type EncodePlan = {
  /** Target video bitrate in kbps (rounded, never below FLOOR_VIDEO_KBPS). */
  videoKbps: number;
  /** Same value in bits/sec — the unit react-native-compressor's `bitrate` option expects. */
  videoBitrate: number;
  /** Cap on the longest dimension (px); we step resolution down as the bitrate budget shrinks. */
  maxSize: number;
  /** True when the (pre-floor) budget hit the floor — further retries won't help, the clip is just too long. */
  atFloor: boolean;
};

/**
 * Compute encode settings for a given clip duration and retry attempt.
 *
 * The budget is purely size-driven: targetBytes are spread across the clip's
 * duration to get a total bitrate, audio is subtracted, and each retry backs the
 * video bitrate off further. Resolution drops on a ladder as the budget tightens
 * so we don't waste bits on pixels we can't afford.
 */
export function planEncode(
  durationSec: number,
  attempt = 0,
  targetBytes = TARGET_BYTES,
): EncodePlan {
  const safeDuration = Math.max(durationSec, 1); // guard against 0 / missing duration
  const totalKbps = (targetBytes * SAFETY * 8) / 1000 / safeDuration;

  // Pre-floor target after subtracting audio headroom and applying retry backoff.
  const target = (totalKbps - RESERVED_AUDIO_KBPS) * Math.pow(RETRY_BACKOFF, attempt);

  // Resolution ladder keyed off the target bitrate (decided before we clamp to the floor).
  let maxSize = 1280;
  if (target < 700) maxSize = 854;
  if (target < 450) maxSize = 640;

  const atFloor = target <= FLOOR_VIDEO_KBPS;
  const videoKbps = Math.round(Math.max(target, FLOOR_VIDEO_KBPS));

  return { videoKbps, videoBitrate: videoKbps * 1000, maxSize, atFloor };
}
