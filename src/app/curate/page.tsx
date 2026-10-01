// Curate — the WYSIWYG editor view (epic 002). Renders the EXACT reader front page the client sees,
// wrapped in EditModeProvider so every story card grows a control puck. Editor-gated.

import { getFrontPage } from '@/lib/worldwide/ranking';
import { guardPage } from '@/lib/studio/guard';
import { getOverrides } from '@/lib/studio/overrides';
import { pinSetTokenOf } from '@/lib/studio/reorder';
import { recentVideos } from '@/lib/worldwide/recent-videos';
import { videos } from '@/components/long-read/videos-data';

import { CurateWorkspace } from './curate-workspace';

export const dynamic = 'force-dynamic';

export default async function Curate() {
  const editor = await guardPage('editor');

  // Read the pin set BEFORE the page so a pin landing in between makes the token stale, never fresh.
  const pinToken = pinSetTokenOf(await getOverrides());
  const data = await getFrontPage('world');

  return (
    <div>
      <CurateWorkspace
        editor={editor.id}
        canManageSections={editor.isAdmin}
        data={data}
        pinToken={pinToken}
        videos={recentVideos(videos, Date.now())}
      />
    </div>
  );
}
