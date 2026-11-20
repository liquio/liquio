// Fallback ambient declaration for apps (e.g. admin-front) that have no
// `modules/tasks/components/CreateTaskButton` module of their own —
// it's cabinet-front-only; cabinet-front's real module takes priority over
// this declaration wherever it actually resolves via path mapping.
declare module 'modules/tasks/components/CreateTaskButton' {
  import { ComponentType } from 'react';

  const CreateTaskButton: ComponentType<Record<string, unknown>>;
  export default CreateTaskButton;
}
