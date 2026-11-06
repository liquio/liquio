// `components/Attach/*` is dead code — confirmed via a repo-wide grep
// finding zero importers in either app — and depends on several modules
// that don't exist anywhere in the repo (not just untyped, genuinely
// absent). These ambient fallbacks exist only so the directory still
// type-checks; the imports were never actually reachable at runtime.
declare module 'variables/styles/attaches' {
  const attachesStyles: Record<string, unknown>;
  export default attachesStyles;
}

declare module 'variables/styles/attachesWizardStep' {
  const attachesWizardStep: Record<string, unknown>;
  export default attachesWizardStep;
}

declare module 'variables/styles/customInputStyle' {
  const customInputStyle: Record<string, unknown>;
  export default customInputStyle;
}

declare module 'variables/styles/tableStyle' {
  const tableStyle: Record<string, unknown>;
  export default tableStyle;
}

declare module 'variables/styles/claimList' {
  const claimListStyles: Record<string, unknown>;
  export default claimListStyles;
}

declare module 'helpers/getAttachName' {
  const getAttachName: (params: Record<string, unknown>) => string;
  export default getAttachName;
}

declare module 'helpers/getAttachStates' {
  const getAttachStates: (this: unknown) => void;
  export default getAttachStates;
}

// No `components/index.ts` barrel exists in this repo.
declare module 'components' {
  import * as React from 'react';

  export const Table: React.ComponentType<Record<string, unknown>>;
  export const Button: React.ComponentType<Record<string, unknown>>;
}
