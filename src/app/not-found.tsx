// Branded 404 (P06 D-3 / E4 — the default one leaked the "Rig Wire" title on DNL).
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Page not found — Democracy News Live' };

export default function NotFound() {
  return (
    <main style={{ maxWidth: 640, margin: '96px auto', padding: '0 16px', textAlign: 'center' }}>
      <p style={{ letterSpacing: '0.12em', fontSize: 12, textTransform: 'uppercase', opacity: 0.7 }}>
        Democracy News Live
      </p>
      <h1 style={{ fontSize: 28, margin: '12px 0' }}>This story isn&apos;t available</h1>
      <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
        It may have been updated, merged into a bigger story, or removed by our editors.
      </p>
      <p style={{ marginTop: 24 }}>
        <a href="/">Go to today&apos;s front page</a>
      </p>
    </main>
  );
}
