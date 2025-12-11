import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Redirect, Route } from 'react-router-dom';
import { history } from 'store';

import checkAccess from 'helpers/checkAccess';
import Preloader from 'components/Preloader';
import { getConfig } from 'helpers/configLoader';

const PrivateRoute = ({
  redirect,
  component: Component,
  userInfo,
  userUnits,
  access,
  uiFilter,
  uiFilters,
  ...rest
}) => {
  const config = getConfig();
  
  if (access && !checkAccess(access, userInfo, userUnits)) {
    history.replace('/');
    return <Preloader flex={true} />;
  }

  if (uiFilter && config.useUIFilters) {
    if (!uiFilters) {
      return <Preloader flex={true} />;
    }

    if (!(uiFilters || []).find(({ filter }) => filter === uiFilter)) {
      history.replace('/messages');
      return <Preloader flex={true} />;
    }
  }

  const RouteComponent = redirect ? Redirect : Route;

  return (
    <RouteComponent
      {...rest}
      render={(props) => {
        const {
          match: { params },
        } = props;

        return <Component {...props} {...rest} {...params} />;
      }}
    />
  );
};

const translated = translate('PageTitles')(PrivateRoute);
export default connect(
  ({ app: { uiFilters = [] } = {}, auth: { userUnits, info } }) => ({
    userUnits: userUnits || [],
    userInfo: info,
    uiFilters,
  }),
)(translated);
