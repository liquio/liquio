import {
  StyledEngineProvider,
  ThemeProvider,
  adaptV4Theme,
  createTheme,
} from "@mui/material/styles";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import React, { Suspense } from "react";
import { Provider } from "react-redux";
import { TranslatorProvider } from "react-translate";
import store from "store";
import "dayjs/locale/nl";
import "dayjs/locale/de";
import "dayjs/locale/fr";
import "dayjs/locale/uk";
import "focus-visible";

import "assets/css/fonts.css";
import "assets/css/main.css";
import Auth from "components/Auth";
import BlockScreen from "components/Auth/BlockScreen";
import theme from "core/theme";
import translation from "core/translation";
import { getConfig } from "helpers/configLoader";
import { getQueryLangParam } from "actions/auth";

// Maps a chosen language code (e.g. 'de-DE', 'eng') to a loaded dayjs locale
const getDayjsLocale = (language) => {
  switch (language) {
    case "de":
    case "de-DE":
      return "de";
    case "fr":
      return "fr";
    case "nl":
    case "nl-NL":
      return "nl";
    case "uk":
    case "uk-UA":
      return "uk";
    default:
      return "en";
  }
};

const AppRouter = React.lazy(() => import("components/AppRouter"));
const WebChat = React.lazy(() => import("components/WebChat"));

export default function getApp() {
  const config = getConfig();

  const translations = translation();

  const auth = (
    <TranslatorProvider translations={translations}>
      <Auth>
        <Suspense
          fallback={<BlockScreen open={true} transparentBackground={true} />}
        >
          <AppRouter />
          <WebChat />
        </Suspense>
      </Auth>
    </TranslatorProvider>
  );

  const storeProvider = <Provider store={store}>{auth}</Provider>;

  const themeProvider = (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={createTheme(adaptV4Theme(theme))}>
        {storeProvider}
      </ThemeProvider>
    </StyledEngineProvider>
  );

  const chosenLanguage = getQueryLangParam() || "en";

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={getDayjsLocale(chosenLanguage)}
    >
      {themeProvider}
    </LocalizationProvider>
  );
}
