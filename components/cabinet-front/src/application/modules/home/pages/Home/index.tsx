import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import checkAccess from 'helpers/checkAccess';
import getModules from 'modules/index';

import { showServiceMessage } from 'actions/error';
import { getConfig } from 'core/helpers/configLoader';

interface Unit {
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

interface HomePageProps {
  actions: { showServiceMessage: (error: unknown) => unknown };
  userUnits: Unit[];
  userInfo: Record<string, unknown>;
  history: { location: { pathname: string }; replace: (route: string) => void };
  onboardingTaskId?: string | null;
}

const HomePage = ({ actions, userUnits, userInfo, history, onboardingTaskId }: HomePageProps) => {
  const config = getConfig();

  const DEFAULT_ROUTE = config.defaultRoute ? config.defaultRoute : '/messages';

  const priorityUnit = (userUnits || [])
    // Preserved as-is: destructures `menuConfig.defaultRoute` directly (no
    // optional chaining), so this throws if any unit's `menuConfig` is ever
    // missing — a pre-existing crash risk, not introduced here.
    .filter((({ menuConfig: { defaultRoute } }: { menuConfig: { defaultRoute?: string } }) => defaultRoute) as never)
    .sort(unitSort)[0];
  const defaultRoute =
    priorityUnit && priorityUnit.menuConfig && priorityUnit.menuConfig.defaultRoute
      ? priorityUnit.menuConfig.defaultRoute
      : DEFAULT_ROUTE;

  if (history.location.pathname !== defaultRoute && !onboardingTaskId) {
    const route = ([] as { path?: string; access?: unknown }[])
      .concat(...(getModules() as { routes?: { path?: string; access?: unknown }[] }[]).map(({ routes }) => routes || []))
      .filter(Boolean)
      .find(({ path }) => path === defaultRoute);

    const hasAccess = route && route.access ? checkAccess(route.access as never, userInfo, userUnits as never) : true;

    if (!hasAccess) {
      actions.showServiceMessage(new Error('User without needed role.'));
      return null;
    }

    history.replace(defaultRoute);
  }

  return null;
};

interface HomeState {
  auth: {
    userUnits: Unit[];
    info: Record<string, unknown> & { onboardingTaskId?: string | null };
  };
}

const mapStateToProps = ({
  auth: {
    userUnits,
    info,
    info: { onboardingTaskId }
  }
}: HomeState) => ({ userUnits, userInfo: info, onboardingTaskId });

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    showServiceMessage: bindActionCreators(showServiceMessage, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatch)(HomePage as never);
