// Editorial CMS — Admin hub. The studio nav links here for admins, but the route
// did not exist (plain 404). This is a directory of the existing admin surfaces,
// not new functionality. The studio layout only gates with requireEditor(), so
// this page re-gates with requireAdmin() and mirrors the layout's 401/403 redirects.
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireAdmin } from '@/lib/studio/session';

export const dynamic = 'force-dynamic';

interface AdminSurface {
  href: string;
  label: string;
  description: string;
}

// Only routes that exist under src/app/studio/. `/studio/lens` is intentionally
// absent — it has no index page, only the dynamic `lens/[id]` story view.
const SURFACES: readonly AdminSurface[] = [
  {
    href: '/studio/sources',
    label: 'Sources',
    description: 'Tag each source’s political lean and see how many are still unrated.',
  },
  {
    href: '/studio/ranking',
    label: 'Ranking knobs',
    description: 'Topic, recency, source and velocity weights the feed ranks by — admin-writable.',
  },
  {
    href: '/studio/merges',
    label: 'Merge review',
    description: 'Recent AI same-event verdicts, so you can check what the machine folded together.',
  },
  {
    href: '/studio/queue',
    label: 'Coming-up queue',
    description: 'Ranked but not yet promoted stories, split by generated and pending.',
  },
  {
    href: '/studio/sections',
    label: 'Section fill',
    description: 'Read-only dashboard of how full each of the ten sections is against its target.',
  },
];

export default async function AdminHub() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-studio-ink">Admin</h1>
      <p className="mt-1 max-w-prose font-sans text-ui-md text-studio-muted">
        Feed-wide configuration and review surfaces. Everything here affects the whole feed, not one story.
      </p>

      <ul className="mt-5 border-t border-studio-rule">
        {SURFACES.map((surface) => (
          <li key={surface.href} className="border-b border-studio-rule bg-studio-paper">
            <Link href={surface.href} className="block px-3 py-3">
              <span className="font-sans text-ui-md font-semibold text-studio-ink">{surface.label}</span>
              <span className="ml-2 font-mono text-ui-sm text-studio-muted">{surface.href}</span>
              <span className="mt-1 block font-sans text-ui-sm text-studio-muted">{surface.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
