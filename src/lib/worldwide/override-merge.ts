// Editor overrides → what the reader's story page shows (DNL program P07 S07.02, issue F1).
//
// Before this, the story page only honoured `editedImage` and the force-surface actions: an editor's
// edited headline / deck / body never reached readers, and a KILLED story still opened by direct URL.
// Pure function so the rules are unit-tested in one place.

export interface OverrideFields {
  action?: string | null;
  editedHeadline?: string | null;
  editedDek?: string | null;
  editedBody?: string | null;
}

export interface GeneratedText {
  headline: string;
  deck: string | null;
  body: string;
}

export interface MergedText {
  /** true → the page must not render (404): an editor killed/unpublished this story */
  hidden: boolean;
  headline: string;
  deck: string | null;
  body: string;
  /** which fields came from the editor (for audit/debug display) */
  edited: Array<'headline' | 'deck' | 'body'>;
}

const HIDDEN_ACTIONS = new Set(['killed']);

function nonBlank(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function mergeEditorialOverride(gen: GeneratedText, ov?: OverrideFields | null): MergedText {
  const edited: MergedText['edited'] = [];
  if (!ov) return { hidden: false, headline: gen.headline, deck: gen.deck, body: gen.body, edited };
  const hidden = HIDDEN_ACTIONS.has(String(ov.action ?? ''));
  let { headline, deck, body } = gen;
  if (nonBlank(ov.editedHeadline)) { headline = ov.editedHeadline.trim(); edited.push('headline'); }
  if (nonBlank(ov.editedDek)) { deck = ov.editedDek.trim(); edited.push('deck'); }
  if (nonBlank(ov.editedBody)) { body = ov.editedBody; edited.push('body'); }
  return { hidden, headline, deck, body, edited };
}
