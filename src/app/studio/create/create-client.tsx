'use client';

// Create screen shell — a Manual | From-a-topic toggle over one of two forms,
// with the editor's own draft jobs ("My Drafts") beneath. The toast provider
// wraps the whole client tree because BriefForm confirms through useToast.

import { useState } from 'react';

import { SegmentedToggle, ToastProvider } from '@/components/studio/ui';

import BriefForm from './brief-form';
import DraftsList from './drafts-list';
import ManualForm, { type DraftInit } from './manual-form';
import { useDraftPolling } from './use-draft-polling';

import type { SegmentedOption } from '@/components/studio/ui';
import type { JobStatus } from '@/lib/dispatch/types';

type Tab = 'manual' | 'brief';

const TABS: ReadonlyArray<SegmentedOption<Tab>> = [
  { key: 'manual', label: 'Manual' },
  { key: 'brief', label: 'From a topic' },
];

interface CreateClientProps {
  initialJobs: ReadonlyArray<JobStatus>;
  /** When false (prod without a configured box), Door B is hidden — manual authoring only. */
  doorBEnabled: boolean;
  /** A saved draft opened from "Recently created" (?draft=<id>). */
  draft?: DraftInit | null;
}

function CreateShell({ initialJobs, doorBEnabled, draft }: CreateClientProps) {
  const [tab, setTab] = useState<Tab>('manual');
  const { jobs, addJob } = useDraftPolling(initialJobs);

  // Door B off: no From-a-topic toggle, no brief form, no drafts tray — just manual authoring, so
  // editors can't gather or publish mock fixture drafts before the generation box is configured.
  if (!doorBEnabled) {
    return <ManualForm key={draft?.id ?? 'new'} initial={draft} />;
  }

  return (
    <div>
      <SegmentedToggle
        ariaLabel="Create mode"
        options={TABS}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'manual' ? <ManualForm key={draft?.id ?? 'new'} initial={draft} /> : <BriefForm onCreated={addJob} />}

      <DraftsList jobs={jobs} />
    </div>
  );
}

export default function CreateClient({ initialJobs, doorBEnabled, draft }: CreateClientProps) {
  return (
    <ToastProvider>
      <CreateShell initialJobs={initialJobs} doorBEnabled={doorBEnabled} draft={draft} />
    </ToastProvider>
  );
}
