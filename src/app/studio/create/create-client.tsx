'use client';

// Create screen shell — a Manual | From-a-topic toggle over one of two forms,
// with the editor's own draft jobs ("My Drafts") beneath. The toast provider
// wraps the whole client tree because BriefForm confirms through useToast.

import { useState } from 'react';

import { SegmentedToggle, ToastProvider } from '@/components/studio/ui';

import BriefForm from './brief-form';
import DraftsList from './drafts-list';
import ManualForm from './manual-form';
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
}

function CreateShell({ initialJobs, doorBEnabled }: CreateClientProps) {
  const [tab, setTab] = useState<Tab>('manual');
  const { jobs, addJob } = useDraftPolling(initialJobs);

  // Door B off: no From-a-topic toggle, no brief form, no drafts tray — just manual authoring, so
  // editors can't gather or publish mock fixture drafts before the generation box is configured.
  if (!doorBEnabled) {
    return <ManualForm />;
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

      {tab === 'manual' ? <ManualForm /> : <BriefForm onCreated={addJob} />}

      <DraftsList jobs={jobs} />
    </div>
  );
}

export default function CreateClient({ initialJobs, doorBEnabled }: CreateClientProps) {
  return (
    <ToastProvider>
      <CreateShell initialJobs={initialJobs} doorBEnabled={doorBEnabled} />
    </ToastProvider>
  );
}
