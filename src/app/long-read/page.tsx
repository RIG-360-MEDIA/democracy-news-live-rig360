import { getFrontPage } from '@/lib/worldwide/ranking';
import { apiScope } from '@/lib/worldwide/to-view';
import { LongReadPage } from '@/components/long-read/long-read-page';

// SSR against the live _v8 keeper (read-only). force-dynamic so a build without DB
// connectivity doesn't try to statically render this page.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Worldwide — Rig Wire',
  description: 'The whole world, gathered into one read — every region’s biggest story today.',
};

function resolveScope(raw: string | undefined): string {
  const key = (raw ?? 'world').toLowerCase();
  if (key === 'world') return 'world';
  if (/^[a-z]{2}$/.test(key)) return apiScope(key);
  return 'world';
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  const data = await getFrontPage(resolveScope(scope));
  return <LongReadPage data={data} />;
}
