import { ComponentType } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as actions from 'services/dataTable/actions';
import type { DataTableEndpoint } from 'services/dataTable/types';

type ActionMap = Record<string, unknown>;
type ActionCreators = Record<string, (endPoint: DataTableEndpoint) => unknown>;

export const mapStateToProps = (state: Record<string, unknown>, { endPoint: { sourceName } }: { endPoint: DataTableEndpoint }) => state[sourceName];

export const mapDispatchToProps = (dispatch: unknown, { endPoint }: { endPoint: DataTableEndpoint }) => ({
  actions: Object.keys(actions)
    .concat(Object.keys(endPoint.actions || {}))
    .filter((value, index, self) => self.indexOf(value) === index)
    .reduce((acc: ActionMap, action) => {
      const actionCreators = actions as unknown as ActionCreators;
      return {
        ...acc,
        [action]: bindActionCreators((acc[action] || actionCreators[action]?.(endPoint)) as never, dispatch as never)
      };
    }, (endPoint.actions || {}) as ActionMap)
});

// See services/dataTable/connect.ts for why the wrapped component's own props stay a loose Record.
export default (component: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> =>
  connect(mapStateToProps, mapDispatchToProps)(component) as ComponentType<Record<string, unknown>>;
