import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { TARGET_PRESETS } from '../lib/encodePlan';

type Stage = { attempt: number; totalAttempts: number; targetKbps: number };
type Props = {
  progress: number;
  stage?: Stage;
  /** 1-based position of the current clip within a batch. */
  index?: number;
  total?: number;
  name?: string;
  /** Clips still waiting — each can be removed or have their target changed before encoding. */
  queued?: { id: string; name: string; targetBytes: number }[];
  onRemove?: (id: string) => void;
  /** Update the target cap for a queued clip. */
  onSetTarget?: (id: string, bytes: number) => void;
  /** Cancel the entire batch and return to home. */
  onCancel?: () => void;
};

/** Progress view shown while the encode loop runs. Screen is kept awake by the orchestrator. */
export function WorkingScreen({ progress, stage, index, total, name, queued, onRemove, onSetTarget, onCancel }: Props) {
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  const batch = typeof total === 'number' && total > 1;
  const upNext = queued ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compressing…</Text>
      {batch ? (
        <Text style={styles.batch} numberOfLines={1}>
          Video {index} of {total}
          {name ? ` · ${name}` : ''}
        </Text>
      ) : null}
      {stage ? (
        <Text style={styles.stage}>
          Pass {stage.attempt} of {stage.totalAttempts} · target {stage.targetKbps} kbps
        </Text>
      ) : null}

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.pct}>{pct}%</Text>

      <Text style={styles.note}>Keep the app open — this can take a moment for long clips.</Text>

      {onCancel ? (
        <TouchableOpacity style={styles.cancel} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      ) : null}

      {upNext.length > 0 ? (
        <View style={styles.queue}>
          <Text style={styles.queueLabel}>Up next · {upNext.length}</Text>
          <ScrollView style={styles.queueList} contentContainerStyle={styles.queueContent}>
            {upNext.map((q) => (
              <View key={q.id} style={styles.queueRow}>
                <View style={styles.queueInfo}>
                  <Text style={styles.queueName} numberOfLines={1}>
                    {q.name}
                  </Text>
                  {onSetTarget ? (
                    <View style={styles.queueChips}>
                      {TARGET_PRESETS.map((p) => {
                        const active = p.bytes === q.targetBytes;
                        return (
                          <TouchableOpacity
                            key={p.label}
                            style={[styles.queueChip, active && styles.queueChipActive]}
                            onPress={() => onSetTarget(q.id, p.bytes)}
                            hitSlop={6}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.queueChipText, active && styles.queueChipTextActive]}>
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                {onRemove ? (
                  <TouchableOpacity
                    onPress={() => onRemove(q.id)}
                    hitSlop={10}
                    style={styles.removeBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  title: { color: theme.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  batch: { color: theme.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  stage: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
  track: {
    height: 12,
    backgroundColor: theme.surface,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: { height: '100%', backgroundColor: theme.accent, borderRadius: 6 },
  pct: { color: theme.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  note: { color: theme.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8 },
  queue: { marginTop: 8, gap: 8 },
  queueLabel: { color: theme.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  queueList: { maxHeight: 180 },
  queueContent: { gap: 8 },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  queueInfo: { flex: 1, gap: 6 },
  queueName: { color: theme.textMuted, fontSize: 14 },
  queueChips: { flexDirection: 'row', gap: 6 },
  queueChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: 'transparent' },
  queueChipActive: { borderColor: theme.accent },
  queueChipText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
  queueChipTextActive: { color: theme.text },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },
  cancel: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: theme.textMuted, fontSize: 15, fontWeight: '600' },
});
