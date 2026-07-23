// RigWire Studio — ivory editorial CMS shell. Auth- AND role-gated chrome for
// every /studio page (epic 002). Studio tokens + Tailwind utilities only; the
// public reader site is untouched (these tokens are additive).
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireEditor } from '@/lib/studio/session';

export const dynamic = 'force-dynamic';

// The five surfaces an editor moves between. Admin is appended only for admins.
const NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Newsroom', href: '/studio' },
  { label: 'Create', href: '/studio/create' },
  { label: 'Front Page', href: '/curate' },
  { label: 'Audit', href: '/studio/audit' },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireEditor();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');
  const { id, isAdmin } = guard.editor;

  const nav = isAdmin ? [...NAV, { label: 'Admin', href: '/studio/admin' }] : NAV;

  return (
    <div className="min-h-[100dvh] bg-studio-paper font-sans text-studio-ink">
      <header className="border-b border-studio-rule bg-studio-paper">
        <div className="mx-auto flex h-[52px] max-w-screen items-center gap-6 px-6">
          {/* Wordmark */}
          <Link
            href="/studio"
            className="font-sans text-ui-lg font-bold uppercase tracking-[0.18em] text-studio-ink no-underline"
          >
            RigWire Studio
          </Link>

          {/* Site-health dot — stubbed nominal; downstream wires real state. */}
          <span
            role="status"
            aria-label="System nominal"
            title="System nominal"
            className="h-2 w-2 shrink-0 rounded-full bg-studio-ink"
          />

          {/* Nav */}
          <nav className="flex flex-1 items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b-2 border-transparent px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-muted no-underline transition-colors hover:border-studio-accent hover:text-studio-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Signed-in editor */}
          <span className="font-mono text-ui-sm text-studio-muted">{id}</span>
        </div>
      </header>

      <main className="mx-auto max-w-screen px-6 py-8 pb-24">{children}</main>
    </div>
  );
}
