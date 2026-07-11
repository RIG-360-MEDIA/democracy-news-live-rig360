// Curate — the WYSIWYG editor view (epic 002). Renders the EXACT reader front page the client sees,
// wrapped in EditModeProvider so every story card grows a control puck. Editor-gated.
import { redirect } from 'next/navigation';

import { EditModeProvider } from '@/components/long-read/edit-mode';
import { LongReadPage } from '@/components/long-read/long-read-page';
import { getFrontPage } from '@/lib/worldwide/ranking';
import { requireEditor } from '@/lib/studio/session';

import { CurateBar } from './curate-bar';

export const dynamic = 'force-dynamic';

export default async function Curate() {
  const guard = await requireEditor();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');

  const data = await getFrontPage('world');

  return (
    <div>
      <CurateBar editor={guard.editor.id} />
      <EditModeProvider>
        <LongReadPage data={data} />
      </EditModeProvider>
    </div>
  );
}
