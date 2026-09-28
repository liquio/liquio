// Fallback ambient declaration for apps (e.g. admin-front) that have no
// `modules/tasks/pages/Task/components/SuccessMessage` module of their own —
// `Payment`'s `commitAfterPayment` branch is a cabinet-front-only feature;
// cabinet-front's real module takes priority over this declaration wherever
// it actually resolves via path mapping.
declare module 'modules/tasks/pages/Task/components/SuccessMessage' {
  import { ComponentType } from 'react';

  const SuccessMessage: ComponentType<Record<string, unknown>>;
  export default SuccessMessage;
}
