/** Per-item state for a batch of videos moving through the compress -> save pipeline. */
import type { CompressSuccess, CompressTooLong } from './compress';

export type Stage = { attempt: number; totalAttempts: number; targetKbps: number };

export type ItemState =
  | { kind: 'queued' }
  | { kind: 'working'; progress: number; stage?: Stage }
  | { kind: 'done'; result: CompressSuccess; saved: boolean }
  | { kind: 'tooLong'; result: CompressTooLong; saved: boolean }
  | { kind: 'error'; message: string };

export type BatchItem = { id: string; uri: string; name: string; state: ItemState };

/** An item is terminal once its pipeline has finished (successfully or not). */
export const isTerminal = (s: ItemState): boolean =>
  s.kind === 'done' || s.kind === 'tooLong' || s.kind === 'error';

/** The file to send/save for a finished item — the compressed output, or the
 * best-effort output for a too-long clip. Null when the item failed. */
export function outputUri(s: ItemState): string | null {
  if (s.kind === 'done') return s.result.uri;
  if (s.kind === 'tooLong') return s.result.bestUri;
  return null;
}
