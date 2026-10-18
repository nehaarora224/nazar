import { Platform, Share } from 'react-native';

import { evidenceDetail, evidenceTitle, SOURCE_KEY } from './content/evidence';
import type { TKey } from './i18n/en';
import type { Evidence } from './store';

type T = (k: TKey, p?: Record<string, string | number>) => string;

/** Build a plain-text timeline of saved records, oldest first — suitable to print or hand over. */
export function buildTimelineText(evidence: Evidence[], t: T, when: (ms: number) => string, dur: (ms: number) => string): string {
  const ordered = [...evidence].sort((a, b) => a.eventAt - b.eventAt);
  const lines = [t('vault.report.title'), t('vault.report.created', { when: when(Date.now()) }), ''];
  ordered.forEach((e, i) => {
    lines.push(`${i + 1}. ${evidenceTitle(e, t)}`);
    lines.push(`   ${t('vault.happened', { when: when(e.eventAt) })}`);
    lines.push(`   ${t('ev.source')}: ${t(SOURCE_KEY[e.kind])}`);
    for (const d of evidenceDetail(e, t, dur)) lines.push(`   ${d}`);
    if (e.reviewNote) lines.push(`   ${t('vault.report.note', { note: e.reviewNote })}`);
    lines.push('');
  });
  return lines.join('\n');
}

export type ExportResult = 'downloaded' | 'saved' | 'shared' | 'failed';

/**
 * Actually hand the timeline to the person as a file. On web this triggers a real file download;
 * on a device it writes a file and opens the share sheet, falling back to sharing the text.
 */
export async function downloadTimeline(filename: string, text: string): Promise<ExportResult> {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return 'downloaded';
    } catch {
      return 'failed';
    }
  }

  // Native: write a real file to the app's documents directory, then offer to share it.
  try {
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.document, filename);
    try {
      file.create({ overwrite: true });
    } catch {
      // Already exists or not needed on this platform.
    }
    file.write(text);
    try {
      await Share.share({ url: file.uri, message: text, title: filename });
      return 'saved';
    } catch {
      return 'saved';
    }
  } catch {
    try {
      await Share.share({ message: text, title: filename });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
}

/** A filesystem-safe filename like nazar-timeline-2026-10-18.txt */
export function timelineFilename(now = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `nazar-timeline-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.txt`;
}
