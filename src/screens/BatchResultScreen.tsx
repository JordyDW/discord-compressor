import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { formatBytes } from '../lib/share';
import { outputUri, type BatchItem } from '../lib/queue';

type Props = {
  items: BatchItem[];
  onSendAll: () => void;
  onSendOne: (id: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
};

/** Results for a batch of videos: a per-clip list plus "send all" to Discord in one go. */
export function BatchResultScreen({ items, onSendAll, onSendOne, onRemove, onReset }: Props) {
  const sendable = items.filter((it) => outputUri(it.state) !== null);
  const overLimit = items.filter((it) => it.state.kind === 'tooLong').length;
  const failed = items.filter((it) => it.state.kind === 'error').length;
  const savedCount = items.filter(
    (it) => (it.state.kind === 'done' || it.state.kind === 'tooLong') && it.state.saved,
  ).length;

  const before = items.reduce(
    (sum, it) =>
      sum +
      (it.state.kind === 'done' || it.state.kind === 'tooLong' ? it.state.result.originalSize : 0),
    0,
  );
  const after = items.reduce((sum, it) => {
    if (it.state.kind === 'done') return sum + it.state.result.finalSize;
    if (it.state.kind === 'tooLong') return sum + it.state.result.bestSize;
    return sum;
  }, 0);

  const summaryParts = [
    `${sendable.length - overLimit} ready`,
    overLimit ? `${overLimit} over limit` : '',
    failed ? `${failed} failed` : '',
  ].filter(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{items.length} videos</Text>
        <Text style={styles.summary}>{summaryParts.join(' · ')}</Text>
        {before > 0 ? (
          <Text style={styles.total}>
            {formatBytes(before)} → <Text style={styles.totalAfter}>{formatBytes(after)}</Text>
          </Text>
        ) : null}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {items.map((it) => (
          <Row key={it.id} item={it} onSend={() => onSendOne(it.id)} onRemove={() => onRemove(it.id)} />
        ))}
      </ScrollView>

      {sendable.length > 0 ? (
        <TouchableOpacity style={styles.primary} onPress={onSendAll} activeOpacity={0.85}>
          <Text style={styles.primaryText}>
            Send {sendable.length > 1 ? `all ${sendable.length}` : ''} to Discord
          </Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.saved}>
        {savedCount > 0 ? `✓ Saved ${savedCount} ${savedCount === 1 ? 'copy' : 'copies'} to gallery` : ' '}
      </Text>

      <TouchableOpacity style={styles.secondary} onPress={onReset} activeOpacity={0.7}>
        <Text style={styles.secondaryText}>Compress more</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ item, onSend, onRemove }: { item: BatchItem; onSend: () => void; onRemove: () => void }) {
  const s = item.state;
  const icon = s.kind === 'done' ? '✓' : s.kind === 'error' ? '✕' : '⚠';
  const color = s.kind === 'done' ? theme.success : theme.danger;
  const canSend = outputUri(s) !== null;

  let detail: string;
  if (s.kind === 'done') detail = `${formatBytes(s.result.originalSize)} → ${formatBytes(s.result.finalSize)}`;
  else if (s.kind === 'tooLong')
    detail = `${formatBytes(s.result.originalSize)} → ${formatBytes(s.result.bestSize)} · too long`;
  else if (s.kind === 'error') detail = s.message;
  else detail = '…';

  return (
    <View style={styles.row}>
      <Text style={[styles.rowIcon, { color }]}>{icon}</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.rowDetail, s.kind === 'error' && { color: theme.danger }]} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      {canSend ? (
        <TouchableOpacity style={styles.rowSend} onPress={onSend} activeOpacity={0.7} hitSlop={8}>
          <Text style={styles.rowSendText}>Send</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.rowRemove} onPress={onRemove} activeOpacity={0.7} hitSlop={8}>
        <Text style={styles.rowRemoveText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 32, gap: theme.gap },
  header: { alignItems: 'center', gap: 4 },
  title: { color: theme.text, fontSize: 22, fontWeight: '800' },
  summary: { color: theme.textMuted, fontSize: 14 },
  total: { color: theme.textMuted, fontSize: 15, fontWeight: '600', marginTop: 2 },
  totalAfter: { color: theme.success, fontWeight: '800' },
  list: { flex: 1 },
  listContent: { gap: 8, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    padding: 14,
  },
  rowIcon: { fontSize: 18, fontWeight: '800', width: 20, textAlign: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowName: { color: theme.text, fontSize: 15, fontWeight: '600' },
  rowDetail: { color: theme.textMuted, fontSize: 13 },
  rowSend: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: theme.surfaceAlt, borderRadius: 10 },
  rowSendText: { color: theme.text, fontSize: 14, fontWeight: '700' },
  rowRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRemoveText: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },
  primary: { backgroundColor: theme.accent, paddingVertical: 16, borderRadius: theme.radius, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  saved: { color: theme.textMuted, fontSize: 13, textAlign: 'center', minHeight: 18 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: theme.textMuted, fontSize: 15, fontWeight: '600' },
});
