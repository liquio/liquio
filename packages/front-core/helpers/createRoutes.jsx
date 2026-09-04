import React from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';

import PrivateRouter from 'components/PrivateRoute';

const createRoute = (prop, key) => {
  const { redirect, path, to, publicRoute } = prop;
  if (redirect) {
    return <Redirect {...{ to, key, from: path }} />;
  }

  const RouterComponent = publicRoute ? Route : PrivateRouter;
  return <RouterComponent exact={true} {...prop} key={key} />;
};

export default (routes) => <Switch>{routes.map(createRoute)}</Switch>;
