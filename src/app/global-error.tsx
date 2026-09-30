'use client';

// Last-resort boundary for errors in the root layout itself (P06 D-3). Must render its own <html>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
        <main style={{ maxWidth: 640, margin: '96px auto', padding: '0 16px', textAlign: 'center' }}>
          <p style={{ letterSpacing: '0.12em', fontSize: 12, textTransform: 'uppercase' }}>Democracy News Live</p>
          <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
          <p>Please try again in a moment.</p>
          <button type="button" onClick={() => reset()} style={{ padding: '10px 18px', cursor: 'pointer' }}>
            Try again
          </button>
          {error.digest ? <p style={{ marginTop: 32, fontSize: 12, opacity: 0.5 }}>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
