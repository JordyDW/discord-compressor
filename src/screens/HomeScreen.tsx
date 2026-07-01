import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

type Props = { onPick: () => void };

/** Idle entry point: explains the app and lets the user pick a clip manually. */
export function HomeScreen({ onPick }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Discord Compressor</Text>
        <Text style={styles.subtitle}>
          Shrink your videos to fit Discord's free 10&nbsp;MB limit — no Nitro, no Boosts needed.
        </Text>
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
