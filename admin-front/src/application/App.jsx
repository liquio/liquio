import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  StyledEngineProvider,
  ThemeProvider,
  adaptV4Theme,
  createTheme
} from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/nl';
import 'dayjs/locale/uk';
import 'focus-visible';
import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import { TranslatorProvider } from 'react-translate';

import 'assets/css/fonts.css';
import 'assets/css/main.css';
import Auth from 'components/Auth';
import BlockScreen from 'components/Auth/BlockScreen';
import WebChat from 'components/WebChat';
import { getConfig } from 'core/helpers/configLoader';
import { getQueryLangParam } from 'actions/auth';
import store from 'store';
import theme from 'theme';
import translation from 'translation';

const AppRouter = React.lazy(() => import('components/AppRouter'));

// Maps a chosen language code (e.g. 'de-DE', 'eng') to a loaded dayjs locale
const getDayjsLocale = (language) => {
  switch (language) {
    case 'de':
    case 'de-DE':
      return 'de';
    case 'fr':
      return 'fr';
    case 'nl':
    case 'nl-NL':
      return 'nl';
    case 'uk':
    case 'uk-UA':
      return 'uk';
    default:
      return 'en';
  }
};

const App = () => {
  const config = getConfig();

  // Follow the user-selected language, falling back to the configured default.
  const language = getQueryLangParam() || config?.defaultLanguage || 'en';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  );

  // Obtain translations at runtime from the translation provider function
  const translations = translation();

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={getDayjsLocale(language)}
    >
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={createTheme(adaptV4Theme(theme))}>
          <Provider store={store}>
            <DndContext
              sensors={sensors}
              autoScroll={false}
              onDragOver={(event) => {
                event.over?.data?.current?.onDragOver &&
                  event.over?.data?.current?.onDragOver(event);
              }}
              onDragEnd={(event) => {
                event.over?.data?.current?.onDragEnd && event.over?.data?.current?.onDragEnd(event);
              }}
              onDragMove={(event) => {
                event.over?.data?.current?.onDragMove &&
                  event.over?.data?.current?.onDragMove(event);
              }}
            >
              <TranslatorProvider translations={translations}>
                <Auth>
                  <Suspense fallback={<BlockScreen open={true} transparentBackground={true} />}>
                    <AppRouter />
                    <WebChat />
                  </Suspense>
                </Auth>
              </TranslatorProvider>
            </DndContext>
          </Provider>
        </ThemeProvider>
      </StyledEngineProvider>
    </LocalizationProvider>
  );
};

export default App;
