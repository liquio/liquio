declare module 'react-translate' {
  import type { ComponentType, ReactNode } from 'react';

  /**
   * `t(key, params)`. At runtime it returns the key itself (`Namespace.key`) for a missing translation, and an
   * array of nodes instead of a string when `params` contains React elements. The string type is the same
   * simplification front-core uses; components that pass elements as params only render the result.
   */
  export type Translate = (key: string, params?: Record<string, unknown>) => string;

  /**
   * The type parameter belongs on the returned function, not on `translate`: that way TypeScript infers it
   * from the wrapped component instead of collapsing it to the `{ t: Translate }` constraint.
   */
  export function translate(
    namespace: string
  ): <P extends { t: Translate }>(Component: ComponentType<P>) => ComponentType<Omit<P, 't'>>;

  export function TranslatorProvider(props: { translations: unknown; children?: ReactNode }): JSX.Element;
}

// `pages/Login` imports the HOC from its file directly; it is the very function `react-translate` re-exports.
declare module 'react-translate/lib/translate' {
  import { translate } from 'react-translate';

  export default translate;
}
