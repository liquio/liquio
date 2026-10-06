// Fallback ambient declaration for apps (e.g. admin-front) that have no
// `components/BreadCrumbs` module of their own — it's cabinet-front-only;
// cabinet-front's real module takes priority over this declaration wherever
// it actually resolves via path mapping.
declare module 'components/BreadCrumbs' {
  import { ComponentType } from 'react';

  const BreadCrumbs: ComponentType<Record<string, unknown>>;
  export default BreadCrumbs;
}
