import { connect } from 'react-redux';
import checkAccess from 'helpers/checkAccess';
import getModules from 'application/modules';

import { showServiceMessage } from 'actions/error';
import { bindActionCreators, Dispatch } from 'redux';

const DEFAULT_ROUTE = '/workflow';

interface Unit {
  id?: number;
  priority?: number;
  menuConfig?: { defaultRoute?: string };
  [key: string]: unknown;
}

const unitSort = (a: Unit, b: Unit) => {
  const aWeight = a.priority || 0;
  const bWeight = b.priority || 0;

  if (aWeight > bWeight) {
    return -1;
  }

  if (aWeight < bWeight) {
    return 1;
  }

  return 0;
};

interface UserInfo {
  [key: string]: unknown;
}

interface HomePageProps {
  actions: { showServiceMessage: (error: Error) => void };
  userUnits?: Unit[];
  userInfo?: UserInfo;
  history: { location: { pathname: string }; replace: (path: string) => void };
}

const HomePage = ({ actions, userUnits, userInfo, history }: HomePageProps) => {
  const priorityUnit = (userUnits || [])
    .filter(({ menuConfig }) => menuConfig && menuConfig.defaultRoute)
    .sort(unitSort)[0];

  const defaultRoute =
    priorityUnit && priorityUnit.menuConfig && priorityUnit.menuConfig.defaultRoute
      ? priorityUnit.menuConfig.defaultRoute
      : DEFAULT_ROUTE;

  if (history.location.pathname !== defaultRoute) {
    const route = ([] as Record<string, unknown>[])
      .concat(...(getModules() as { routes?: Record<string, unknown>[] }[]).map(({ routes }) => routes || []))
      .filter(Boolean)
      .find(({ path }) => path === defaultRoute);

    const hasAccess =
      route && route.access ? checkAccess(route.access as never, userInfo, userUnits as never) : true;

    if (!hasAccess) {
      actions.showServiceMessage(new Error('User without needed role.'));
      return null;
    }

    history.replace(defaultRoute);
  }

  return null;
};

interface ConnectedState {
  auth: { userUnits: Unit[]; info: UserInfo };
}

const mapStateToProps = ({ auth: { userUnits, info } }: ConnectedState) => ({
  userUnits,
  userInfo: info
});

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    showServiceMessage: bindActionCreators(showServiceMessage, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatch)(HomePage as never);
