import React, { ComponentType } from 'react';
import { connect } from 'react-redux';
import { translate, Translate } from 'react-translate';
import { Redirect, Route, RouteComponentProps } from 'react-router-dom';
import { history } from 'store';

import checkAccess from 'helpers/checkAccess';
import Preloader from 'components/Preloader';
import { getConfig } from 'helpers/configLoader';
import type { AuthUnit } from 'core/types/authState';
import type { AuthUser } from 'core/types/auth';

interface UiFilter {
  filter?: string;
  [key: string]: unknown;
}

interface PrivateRouteProps {
  redirect?: boolean;
  component: ComponentType<Record<string, unknown>>;
  userInfo?: AuthUser | null;
  userUnits?: AuthUnit[];
  access?: Record<string, unknown>;
  uiFilter?: string;
  uiFilters?: UiFilter[];
  t: Translate;
  [key: string]: unknown;
}

// Preloader only ever reads its `classes` prop; the `flex` prop passed below was already a no-op.
const PrivateRoute = ({ redirect, component: Component, userInfo, userUnits, access, uiFilter, uiFilters, ...rest }: PrivateRouteProps) => {
  const config = getConfig();

  if (access && !checkAccess(access, userInfo || {}, userUnits || [])) {
    history.replace('/');
    return <Preloader />;
  }

  if (uiFilter && config.useUIFilters) {
    if (!uiFilters) {
      return <Preloader />;
    }

    if (!(uiFilters || []).find(({ filter }) => filter === uiFilter)) {
      history.replace('/messages');
      return <Preloader />;
    }
  }

  const RouteComponent = redirect ? Redirect : Route;

  // rest may or may not include `to` (required only by Redirect) depending on the route config;
  // that varies at runtime based on `redirect`, which TS can't express for a dynamically chosen
  // component, so the merged props are cast to satisfy both branches.
  const routeProps = {
    ...rest,
    render: (props: RouteComponentProps) => {
      const {
        match: { params }
      } = props;

      return <Component {...props} {...rest} {...params} />;
    }
  } as unknown as React.ComponentProps<typeof Route> & React.ComponentProps<typeof Redirect>;

  return <RouteComponent {...routeProps} />;
};

const translated = translate('PageTitles')(PrivateRoute);

interface ConnectedState {
  app?: { uiFilters?: UiFilter[] };
  auth: { userUnits?: AuthUnit[] | null; info: AuthUser | null };
}

export default connect(({ app: { uiFilters = [] } = {}, auth: { userUnits, info } }: ConnectedState) => ({
  userUnits: userUnits || [],
  userInfo: info,
  uiFilters
}))(translated);
