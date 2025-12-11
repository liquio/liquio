import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  StyledEngineProvider,
  ThemeProvider,
  adaptV4Theme,
  createTheme
} from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'dayjs/locale/fr';
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
import store from 'store';
import theme from 'theme';
import translation from 'translation';

const AppRouter = React.lazy(() => import('components/AppRouter'));

const App = () => {
  const config = getConfig();

  const locale = config?.defaultLanguage || 'en';

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
      adapterLocale={locale === 'eng' ? 'en' : locale}
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
