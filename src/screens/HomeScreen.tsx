import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { TARGET_PRESETS } from '../lib/encodePlan';

type Props = { onPick: () => void; target: number; onTarget: (bytes: number) => void };

/** Idle entry point: explains the app and lets the user pick a clip manually. */
export function HomeScreen({ onPick, target, onTarget }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Discord Compressor</Text>
        <Text style={styles.subtitle}>
          Shrink your videos to fit Discord's free 10&nbsp;MB limit — no Nitro, no Boosts needed.
        </Text>
      </View>

      <View style={styles.presets}>
        <Text style={styles.presetLabel}>Target size</Text>
        <View style={styles.chips}>
          {TARGET_PRESETS.map((p) => {
            const active = p.bytes === target;
            return (
              <TouchableOpacity
                key={p.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onTarget(p.bytes)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={onPick} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Pick videos</Text>
      </TouchableOpacity>

      <Text style={styles.tip}>
        Pick one or several at once. Or, in your gallery, tap{' '}
        <Text style={styles.tipStrong}>Share → Discord Compressor</Text> to compress straight from
        the camera.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: theme.gap * 2 },
  hero: { gap: 12, alignItems: 'center' },
  title: { color: theme.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: theme.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  presets: { gap: 10, alignItems: 'center' },
  presetLabel: { color: theme.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: theme.surfaceAlt, borderColor: theme.accent },
  chipText: { color: theme.textMuted, fontSize: 15, fontWeight: '700' },
  chipTextActive: { color: theme.text },
  button: {
    backgroundColor: theme.accent,
    paddingVertical: 16,
    borderRadius: theme.radius,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  tip: { color: theme.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  tipStrong: { color: theme.text, fontWeight: '700' },
});
