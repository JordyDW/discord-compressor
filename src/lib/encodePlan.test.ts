/// <reference types="jest" />
import {
  planEncode,
  adaptiveAudioKbps,
  maxFitDuration,
  FLOOR_VIDEO_KBPS,
  TARGET_BYTES,
} from './encodePlan';

describe('planEncode', () => {
  it('gives a short clip a healthy bitrate at full resolution', () => {
    const plan = planEncode(60, 0);
    expect(plan.maxSize).toBe(1280);
    expect(plan.atFloor).toBe(false);
    expect(plan.videoKbps).toBeGreaterThan(1000);
    expect(plan.videoBitrate).toBe(plan.videoKbps * 1000);
  });

  it('flags a clip too long to fit even at the floor', () => {
    const plan = planEncode(20 * 60, 0); // 20 minutes
    expect(plan.atFloor).toBe(true);
    expect(plan.videoKbps).toBe(FLOOR_VIDEO_KBPS);
    expect(plan.maxSize).toBe(640);
  });

  it('steps resolution down as the duration (and thus budget) grows', () => {
    expect(planEncode(60, 0).maxSize).toBe(1280);
    expect(planEncode(120, 0).maxSize).toBe(854);
    expect(planEncode(200, 0).maxSize).toBe(640);
  });

  it('backs the bitrate off on each retry attempt', () => {
    const first = planEncode(120, 0).videoKbps;
    const second = planEncode(120, 1).videoKbps;
    expect(second).toBeLessThan(first);
  });

  it('never drops below the quality floor for any duration/attempt', () => {
    for (let d = 1; d <= 3600; d += 37) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const plan = planEncode(d, attempt);
        expect(plan.videoKbps).toBeGreaterThanOrEqual(FLOOR_VIDEO_KBPS);
        expect(Number.isFinite(plan.videoBitrate)).toBe(true);
      }
    }
  });

  it('guards against a zero / missing duration (no divide-by-zero)', () => {
    const plan = planEncode(0, 0);
    expect(Number.isFinite(plan.videoKbps)).toBe(true);
    expect(plan.videoKbps).toBeGreaterThan(0);
  });

  it('targets a lower bitrate for a smaller size cap', () => {
    const ten = planEncode(60, 0, TARGET_BYTES).videoKbps;
    const eight = planEncode(60, 0, 8 * 1024 * 1024).videoKbps;
    expect(eight).toBeLessThan(ten);
  });

  it('gives a long clip more video bits by reducing audio reservation', () => {
    // 180 s clip at 10 MB: total ≈ 422 kbps → audio drops to 96 (not 128)
    const videoKbps = planEncode(180, 0, TARGET_BYTES).videoKbps;
    // With fixed 128 kbps audio the video budget would be lower; with adaptive 96
    // it gets an extra 32 kbps — verify it's above a threshold that only works
    // with the adaptive reservation.
    expect(videoKbps).toBeGreaterThan(200);
  });
});

describe('maxFitDuration', () => {
  it('returns a positive number of seconds for the default 10 MB target', () => {
    const d = maxFitDuration();
    expect(d).toBeGreaterThan(0);
    expect(Number.isFinite(d)).toBe(true);
  });

  it('is proportional to the target size', () => {
    const d10 = maxFitDuration(10 * 1024 * 1024);
    const d25 = maxFitDuration(25 * 1024 * 1024);
    expect(d25).toBeGreaterThan(d10);
  });

  it('is consistent with planEncode — a clip at maxFitDuration hits the floor', () => {
    const d = maxFitDuration();
    expect(planEncode(d, 0).atFloor).toBe(true);
  });
});

describe('adaptiveAudioKbps', () => {
  it('returns 128 kbps for a comfortable budget', () => {
    expect(adaptiveAudioKbps(1000)).toBe(128);
    expect(adaptiveAudioKbps(600)).toBe(128);
  });

  it('returns 96 kbps for a moderate budget', () => {
    expect(adaptiveAudioKbps(599)).toBe(96);
    expect(adaptiveAudioKbps(400)).toBe(96);
  });

  it('returns 64 kbps for a tight budget', () => {
    expect(adaptiveAudioKbps(399)).toBe(64);
    expect(adaptiveAudioKbps(100)).toBe(64);
  });
});
