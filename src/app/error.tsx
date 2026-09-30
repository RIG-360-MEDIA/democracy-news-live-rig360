'use client';

// Route-level error boundary (DNL program P06 D-3). Before this there was no error page, so a data
// outage showed the framework's raw 500. Server details are logged, never shown to readers.
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[reader] render error', error.digest ?? '', error.message);
  }, [error]);

  return (
    <main style={{ maxWidth: 640, margin: '96px auto', padding: '0 16px', textAlign: 'center' }}>
      <p style={{ letterSpacing: '0.12em', fontSize: 12, textTransform: 'uppercase', opacity: 0.7 }}>
        Democracy News Live
      </p>
      <h1 style={{ fontSize: 28, margin: '12px 0' }}>We couldn&apos;t load this page right now</h1>
      <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
        Our news service is having a temporary problem. Please try again in a moment.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
        <button type="button" onClick={() => reset()} style={{ padding: '10px 18px', cursor: 'pointer' }}>
          Try again
        </button>
        <a href="/" style={{ padding: '10px 18px' }}>Front page</a>
      </div>
      {error.digest ? <p style={{ marginTop: 32, fontSize: 12, opacity: 0.5 }}>Reference: {error.digest}</p> : null}
    </main>
  );
}
