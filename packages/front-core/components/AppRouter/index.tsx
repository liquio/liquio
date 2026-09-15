import React, { Suspense } from 'react';
import { connect } from 'react-redux';
import { Router, Switch } from 'react-router-dom';
import { history } from 'store';

import getModules from 'modules/index';
import plugins from 'core/plugins';
import BlockScreen from 'components/BlockScreen';
import PrivateRoute from 'components/PrivateRoute';

interface RouteDef {
  isOnboarding?: boolean;
  [key: string]: unknown;
}

interface RouteModule {
  routes?: RouteDef[];
  [key: string]: unknown;
}

const routesFilter = (onboardingTaskId: string | null) => ({ isOnboarding }: RouteDef) =>
  onboardingTaskId ? isOnboarding : !isOnboarding;

interface AppRouterProps {
  onboardingTaskId?: string | null;
}

const AppRouter = ({ onboardingTaskId = null }: AppRouterProps) => {
  const routes = ([] as RouteDef[])
    .concat(...([] as RouteModule[]).concat(plugins, getModules()).map((module) => module.routes || []))
    .filter(routesFilter(onboardingTaskId));

  return (
    <Router history={history}>
      <Suspense fallback={<BlockScreen open={true} transparentBackground={true} />}>
        <Switch>
          {routes.map((route, key) => (
            <PrivateRoute exact={true} key={key} {...route} />
          ))}
        </Switch>
      </Suspense>
    </Router>
  );
};

interface ConnectedState {
  auth: { info: { onboardingTaskId?: string | null } | null };
}

const mapStateToProps = ({ auth: { info } }: ConnectedState) => {
  // Matches the original: destructuring throws here if `info` is actually null at runtime.
  const { onboardingTaskId } = info as { onboardingTaskId?: string | null };
  return { onboardingTaskId };
};

export default connect(mapStateToProps)(AppRouter);
