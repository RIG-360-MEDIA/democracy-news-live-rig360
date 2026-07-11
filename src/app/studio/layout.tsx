// Editorial CMS shell — auth- AND role-gated chrome for every /studio page (epic 002).
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireEditor } from '@/lib/studio/session';

export const dynamic = 'force-dynamic';

// Three things an editor ever does. Everything else is a quiet admin/reference corner.
const PRIMARY: [string, string][] = [
  ['Front Page', '/curate'], // see exactly what readers see, click any card to control it
  ['Review', '/studio'], // the list: approve held stories, pick the top, hide the bad
  ['Write', '/studio/create'], // author a manual story
];
// [label, href, adminOnly] — secondary/admin surfaces, de-emphasised.
const SECONDARY: [string, string, boolean][] = [
  ['Sections', '/studio/sections', false],
  ['Audit', '/studio/audit', false],
  ['Ranking', '/studio/ranking', true],
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireEditor();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');
  const { id, role, isAdmin } = guard.editor;

  const secondary = SECONDARY.filter(([, , adminOnly]) => !adminOnly || isAdmin);

  return (
    <div style={{ minHeight: '100dvh', background: '#f6f6f5', fontFamily: 'var(--font-jakarta), system-ui, sans-serif', color: '#1a1a1a' }}>
      <header style={{ background: '#0d0a08', color: '#fff', padding: '0 20px' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 22, height: 52 }}>
          <span style={{ fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
            Rig<span style={{ color: '#e0555b' }}>Wire</span> <span style={{ opacity: 0.5, fontWeight: 600 }}>Studio</span>
          </span>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {PRIMARY.map(([label, href]) => (
              <Link key={href} href={href} style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, padding: '6px 12px', borderRadius: 6 }}>
                {label}
              </Link>
            ))}
            <span style={{ width: 1, height: 18, background: '#333', margin: '0 8px' }} aria-hidden />
            {secondary.map(([label, href]) => (
              <Link key={href} href={href} style={{ color: '#8f8f8f', fontSize: 12, fontWeight: 600, padding: '6px 9px', borderRadius: 6 }}>
                {label}
              </Link>
            ))}
          </nav>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              padding: '3px 7px',
              borderRadius: 5,
              background: isAdmin ? '#7a1e22' : '#333',
              color: '#fff',
            }}
          >
            {role}
          </span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{id}</span>
        </div>
      </header>
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '22px 24px 90px' }}>{children}</main>
    </div>
  );
}
