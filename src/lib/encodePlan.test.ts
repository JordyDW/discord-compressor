/// <reference types="jest" />
import {
  planEncode,
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
});
