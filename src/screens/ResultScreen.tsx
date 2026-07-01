import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { formatBytes } from '../lib/share';
import type { CompressResult } from '../lib/compress';

type Props = {
  result: CompressResult;
  saved: boolean;
  onSend: () => void;
  onReset: () => void;
};

/** Shown after the encode finishes — handles both the success and "too long to fit" cases. */
export function ResultScreen({ result, saved, onSend, onReset }: Props) {
  const fits = result.ok;
  const finalSize = result.ok ? result.finalSize : result.bestSize;

  return (
    <View style={styles.container}>
      <Text style={[styles.badge, { color: fits ? theme.success : theme.danger }]}>
        {fits ? (result.skipped ? '✓ Already under 10 MB' : '✓ Ready for Discord') : '⚠ Still over 10 MB'}
      </Text>

      <View style={styles.sizes}>
        <View style={styles.sizeBox}>
          <Text style={styles.sizeLabel}>Before</Text>
          <Text style={styles.sizeValue}>{formatBytes(result.originalSize)}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={styles.sizeBox}>
          <Text style={styles.sizeLabel}>After</Text>
          <Text style={[styles.sizeValue, { color: fits ? theme.success : theme.danger }]}>
            {formatBytes(finalSize)}
          </Text>
        </View>
      </View>

      {!fits ? (
        <Text style={styles.warn}>
          This clip is too long to fit 10 MB even at the lowest quality. Trim it shorter and try
          again — you can still send the {formatBytes(finalSize)} version below.
        </Text>
      ) : null}

      <TouchableOpacity style={styles.primary} onPress={onSend} activeOpacity={0.85}>
        <Text style={styles.primaryText}>Send to Discord</Text>
      </TouchableOpacity>

      <Text style={styles.saved}>{saved ? '✓ Copy saved to gallery' : 'Saving copy to gallery…'}</Text>

      <TouchableOpacity style={styles.secondary} onPress={onReset} activeOpacity={0.7}>
        <Text style={styles.secondaryText}>Compress another</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: theme.gap },
  badge: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sizes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 8 },
  sizeBox: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, minWidth: 110, alignItems: 'center' },
  sizeLabel: { color: theme.textMuted, fontSize: 13, marginBottom: 4 },
  sizeValue: { color: theme.text, fontSize: 22, fontWeight: '800' },
  arrow: { color: theme.textMuted, fontSize: 22, fontWeight: '700' },
  warn: { color: theme.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  primary: { backgroundColor: theme.accent, paddingVertical: 16, borderRadius: theme.radius, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  saved: { color: theme.textMuted, fontSize: 13, textAlign: 'center' },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: theme.textMuted, fontSize: 15, fontWeight: '600' },
});
