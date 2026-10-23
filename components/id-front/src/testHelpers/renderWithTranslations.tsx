import type { ReactElement, ReactNode } from 'react';
import { TranslatorProvider } from 'react-translate';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { ThemeWrapper } from './renderWithTheme';
import en from 'variables/translations/en-GB';

/**
 * renderWithTheme plus a react-translate `TranslatorProvider`, as src/App.jsx nests it. Components that are
 * wrapped in `translate(...)` need it. The providers are a `wrapper`, so `rerender` keeps them. Pass custom
 * translations to control the strings, or use the real English ones by default.
 *
 * Note: `translate()` caches its `t` per component and locale, so within one test file the first translations
 * a component sees win; use one set of translations per file.
 */
export default function renderWithTranslations(ui: ReactElement, translations: unknown = en): RenderResult {
  const Wrapper = ({ children }: { children?: ReactNode }) => (
    <ThemeWrapper>
      <TranslatorProvider translations={translations}>
        <>{children}</>
      </TranslatorProvider>
    </ThemeWrapper>
  );
  return render(ui, { wrapper: Wrapper });
}
