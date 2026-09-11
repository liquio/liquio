// Fallback ambient declaration for apps (e.g. admin-front) that have no
// `modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages`
// module of their own — `DocumentSharing` is a cabinet-front-only feature;
// cabinet-front's real module takes priority over this declaration wherever
// it actually resolves via path mapping.
declare module 'modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages' {
  import { ComponentType } from 'react';

  const ExtReaderMessages: ComponentType<Record<string, unknown>>;
  export default ExtReaderMessages;
}
