declare module 'react-translate' {
  import { ComponentType, ReactNode } from 'react';

  export type Translate = (key: string, params?: Record<string, unknown>) => string;

  export function useTranslate(namespace: string): Translate;

  export function translate(
    namespace: string
  ): <P extends { t: Translate }>(Component: ComponentType<P>) => ComponentType<Omit<P, 't'>>;

  export function TranslatorProvider(props: { translations: unknown; children: ReactNode }): JSX.Element;
}
