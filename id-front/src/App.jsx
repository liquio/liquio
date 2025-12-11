import React from 'react';
import { Provider } from 'react-redux';
import { TranslatorProvider } from 'react-translate';
import { ThemeProvider, StyledEngineProvider, createTheme, adaptV4Theme } from '@mui/material/styles';
import { Router, Route, Switch, Redirect } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import store from 'store';

import { getConfig } from 'helpers/configLoader';
import 'assets/css/main.css';
import translations from 'variables/translations';
import indexRoutes from 'routes';
import Auth from 'components/Auth';
import theme from 'themes';
import getCookie from 'helpers/getCookie';

export default function App() {
  const config = getConfig();

  const langCookie = getCookie('lang');

  React.useEffect(() => {
    document.title = langCookie === 'eng' ? 'DIIA - Entry' : config.APP_TITLE;
  }, [langCookie]);

  const hist = createBrowserHistory();

  const createRoute = (prop, key) => {
    const { redirect, to } = prop;
    if (redirect) {
      return <Redirect to={to} key={key} />;
    }
    return <Route exact={true} {...prop} key={key} />;
  };

  const router = (
    <Router history={hist}>
      <Switch>{indexRoutes.map(createRoute)}</Switch>
    </Router>
  );

  const auth = (
    <TranslatorProvider translations={translations(config.APP_NAME)}>
      <Auth>{router}</Auth>
    </TranslatorProvider>
  );

  const storeProvider = <Provider store={store}>{auth}</Provider>;

  const themeProvider = (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={createTheme(adaptV4Theme(theme))}>{storeProvider}</ThemeProvider>
    </StyledEngineProvider>
  );

  const locale = (config?.defaultLanguage || 'en') === 'eng' ? 'en' : config?.defaultLanguage || 'en';

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
      {themeProvider}
    </LocalizationProvider>
  );
}
