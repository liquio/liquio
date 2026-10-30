import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import PrivateRouter from 'components/PrivateRoute';

interface RouteDef {
  redirect?: boolean;
  path?: string;
  to?: string;
  publicRoute?: boolean;
  [key: string]: unknown;
}

const createRoute = (prop: RouteDef, key: number) => {
  const { redirect, path, to, publicRoute } = prop;
  if (redirect) {
    return <Redirect {...{ to, key, from: path } as { to: string; key: number; from?: string }} />;
  }

  const RouterComponent = publicRoute ? Route : PrivateRouter;
  return <RouterComponent exact={true} {...prop} key={key} />;
};

export default (routes: RouteDef[]) => <Switch>{routes.map(createRoute)}</Switch>;
