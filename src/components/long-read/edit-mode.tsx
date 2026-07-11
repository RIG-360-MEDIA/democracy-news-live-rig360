'use client';

// WYSIWYG curation (epic 002): the same reader components render inside /curate wrapped in this
// provider. Story cards read `useEditMode()` — true only under the provider — and grow control pucks.
// The public reader (no provider) gets the default `false`, so its markup is unchanged.

import { createContext, useContext } from 'react';

const EditModeContext = createContext(false);

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  return <EditModeContext.Provider value={true}>{children}</EditModeContext.Provider>;
}

export function useEditMode(): boolean {
  return useContext(EditModeContext);
}
