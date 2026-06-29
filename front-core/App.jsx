import {
  StyledEngineProvider,
  ThemeProvider,
  adaptV4Theme,
  createTheme
} from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import { TranslatorProvider } from 'react-translate';
import store from 'store';
import 'dayjs/locale/nl';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/uk';
import 'focus-visible';

import 'assets/css/fonts.css';
import 'assets/css/main.css';
import Auth from 'components/Auth';
import BlockScreen from 'components/Auth/BlockScreen';
import { getQueryLangParam } from 'actions/auth';
import theme from 'core/theme';
import translation from 'core/translation';
import { getConfig } from 'helpers/configLoader';

const AppRouter = React.lazy(() => import('components/AppRouter'));
const WebChat = React.lazy(() => import('components/WebChat'));

const dayjsLocales = {
  de: 'de',
  'de-DE': 'de',
  fr: 'fr',
  'fr-FR': 'fr',
  nl: 'nl',
  'nl-NL': 'nl',
  uk: 'uk',
  'uk-UA': 'uk',
  ua: 'uk',
  eng: 'en',
  en: 'en',
  'en-GB': 'en'
};

export default function getApp() {
  const config = getConfig();

  const translations = translation();

  const auth = (
    <TranslatorProvider translations={translations}>
      <Auth>
        <Suspense fallback={<BlockScreen open={true} transparentBackground={true} />}>
          <AppRouter />
          <WebChat />
        </Suspense>
      </Auth>
    </TranslatorProvider>
  );

  const storeProvider = <Provider store={store}>{auth}</Provider>;

  const themeProvider = (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={createTheme(adaptV4Theme(theme))}>{storeProvider}</ThemeProvider>
    </StyledEngineProvider>
  );

  const language = getQueryLangParam() || config?.defaultLanguage || 'en';
  const locale = dayjsLocales[language] || 'en';

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={locale}
    >
      {themeProvider}
    </LocalizationProvider>
  );
}
