import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useShareIntent } from 'expo-share-intent';

import { theme } from './src/theme';
import { compressUnderLimit } from './src/lib/compress';
import { TARGET_BYTES } from './src/lib/encodePlan';
import { sendToDiscord, sendMultipleToDiscord, saveCopy } from './src/lib/share';
import { isTerminal, outputUri, type BatchItem, type ItemState } from './src/lib/queue';
import { HomeScreen } from './src/screens/HomeScreen';
import { WorkingScreen } from './src/screens/WorkingScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { BatchResultScreen } from './src/screens/BatchResultScreen';

type Phase = { kind: 'idle' } | { kind: 'run'; items: BatchItem[] };

type Input = { uri: string; name: string };

const KEEP_AWAKE_TAG = 'compress';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [targetBytes, setTargetBytes] = useState<number>(TARGET_BYTES);
  const busyRef = useRef(false);
  // ids the user removed mid-batch, so the loop skips them before they encode
  const removedRef = useRef<Set<string>>(new Set());

  // Compress a queue of videos one at a time (MediaCodec is happier sequential),
  // saving a copy of each as it finishes. Works for a single clip or a batch.
  const start = useCallback(async (inputs: Input[], target: number) => {
    if (busyRef.current || inputs.length === 0) return;
    busyRef.current = true;
    removedRef.current = new Set();

    const items: BatchItem[] = inputs.map((inp, i) => ({
      id: `item-${i}`,
      uri: inp.uri,
      name: inp.name,
      targetBytes: target,
      state: { kind: 'queued' },
    }));
    setPhase({ kind: 'run', items });

    const patch = (id: string, next: (it: BatchItem) => BatchItem) =>
      setPhase((cur) =>
        cur.kind === 'run'
          ? { ...cur, items: cur.items.map((it) => (it.id === id ? next(it) : it)) }
          : cur,
      );
    const setState = (id: string, state: ItemState) => patch(id, (it) => ({ ...it, state }));

    try {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);

      for (const item of items) {
        if (removedRef.current.has(item.id)) continue; // user removed it before it started
        setState(item.id, { kind: 'working', progress: 0 });
        try {
          const result = await compressUnderLimit(
            item.uri,
            {
              onProgress: (progress) =>
                patch(item.id, (it) =>
                  it.state.kind === 'working' ? { ...it, state: { ...it.state, progress } } : it,
                ),
              onStage: (stage) =>
                patch(item.id, (it) =>
                  it.state.kind === 'working'
                    ? { ...it, state: { kind: 'working', progress: 0, stage } }
                    : it,
                ),
            },
            item.targetBytes,
          );

          const state: ItemState = result.ok
            ? { kind: 'done', result, saved: false }
            : { kind: 'tooLong', result, saved: false };
          setState(item.id, state);

          const out = outputUri(state);
          if (out) {
            const saved = await saveCopy(out);
            patch(item.id, (it) =>
              it.state.kind === 'done' || it.state.kind === 'tooLong'
                ? { ...it, state: { ...it.state, saved } }
                : it,
            );
          }
        } catch (e) {
          setState(item.id, {
            kind: 'error',
            message: e instanceof Error ? e.message : 'Compression failed',
          });
        }
      }
    } finally {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      busyRef.current = false;
    }
  }, []);

  // expo-share-intent's hook delivers both the launch ("Share → Discord
  // Compressor") payload and any share that arrives while the app is open. A
  // SEND_MULTIPLE share arrives as several files at once.
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    resetOnBackground: false,
  });

  useEffect(() => {
    if (!hasShareIntent) return;
    const files = shareIntent.files ?? [];
    const videos = files.filter((f) => f.mimeType?.startsWith('video/'));
    const use = videos.length ? videos : files;
    if (use.length) {
      start(use.map((f, i) => ({ uri: f.path, name: f.fileName || `Video ${i + 1}` })), targetBytes);
      resetShareIntent(); // clear so a re-open doesn't re-run the last share
    }
  }, [hasShareIntent, shareIntent, start, resetShareIntent, targetBytes]);

  const pickVideos = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!res.canceled && res.assets.length) {
      start(res.assets.map((a, i) => ({ uri: a.uri, name: a.fileName || `Video ${i + 1}` })), targetBytes);
    }
  }, [start, targetBytes]);

  const reset = useCallback(() => {
    busyRef.current = false;
    setPhase({ kind: 'idle' });
  }, []);

  // Drop a clip from the batch. Queued clips are skipped before they encode;
  // finished clips are just removed from the results list. Emptying the list resets.
  const removeItem = useCallback((id: string) => {
    removedRef.current.add(id);
    setPhase((cur) => {
      if (cur.kind !== 'run') return cur;
      const items = cur.items.filter((it) => it.id !== id);
      if (items.length === 0) {
        busyRef.current = false;
        return { kind: 'idle' };
      }
      return { ...cur, items };
    });
  }, []);

  let content: ReactNode = null;
  if (phase.kind === 'idle') {
    content = <HomeScreen onPick={pickVideos} target={targetBytes} onTarget={setTargetBytes} />;
  } else {
    const { items } = phase;
    const allDone = items.every((it) => isTerminal(it.state));

    if (!allDone) {
      const workingIdx = items.findIndex((it) => it.state.kind === 'working');
      const idx = workingIdx === -1 ? items.findIndex((it) => !isTerminal(it.state)) : workingIdx;
      const cur = items[idx] ?? items[0];
      const st = cur.state;
      content = (
        <WorkingScreen
          progress={st.kind === 'working' ? st.progress : 0}
          stage={st.kind === 'working' ? st.stage : undefined}
          index={idx + 1}
          total={items.length}
          name={cur.name}
          queued={items
            .filter((it) => it.state.kind === 'queued')
            .map((it) => ({ id: it.id, name: it.name }))}
          onRemove={removeItem}
        />
      );
    } else if (items.length === 1) {
      const only = items[0];
      if (only.state.kind === 'error') {
        content = <ErrorView message={only.state.message} onReset={reset} />;
      } else if (only.state.kind === 'done' || only.state.kind === 'tooLong') {
        const single = only.state;
        content = (
          <ResultScreen
            result={single.result}
            saved={single.saved}
            targetBytes={only.targetBytes}
            onSend={() => {
              const out = outputUri(single);
              if (out) sendToDiscord(out);
            }}
            onReset={reset}
          />
        );
      }
    } else {
      content = (
        <BatchResultScreen
          items={items}
          onSendAll={() =>
            sendMultipleToDiscord(
              items.map((it) => outputUri(it.state)).filter((u): u is string => u !== null),
            )
          }
          onSendOne={(id) => {
            const out = outputUri(items.find((it) => it.id === id)?.state ?? { kind: 'queued' });
            if (out) sendToDiscord(out);
          }}
          onRemove={removeItem}
          onReset={reset}
        />
      );
    }
  }

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar style="light" />
      {content}
    </View>
  );
}

function ErrorView({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMsg}>{message}</Text>
      <TouchableOpacity style={styles.errorBtn} onPress={onReset} activeOpacity={0.85}>
        <Text style={styles.errorBtnText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  error: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  errorTitle: { color: theme.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorMsg: { color: theme.textMuted, fontSize: 14, textAlign: 'center' },
  errorBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: theme.radius,
    alignItems: 'center',
    marginTop: 8,
  },
  errorBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
