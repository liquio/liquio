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
import 'dayjs/locale/fr';
import 'dayjs/locale/uk';
import 'focus-visible';

import 'assets/css/fonts.css';
import 'assets/css/main.css';
import Auth from 'components/Auth';
import BlockScreen from 'components/Auth/BlockScreen';
import theme from 'core/theme';
import translation from 'core/translation';
import { getConfig } from 'helpers/configLoader';

const AppRouter = React.lazy(() => import('components/AppRouter'));
const WebChat = React.lazy(() => import('components/WebChat'));

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

  const locale = config?.defaultLanguage || 'en';

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={locale === 'eng' ? 'en' : locale}
    >
      {themeProvider}
    </LocalizationProvider>
  );
}
