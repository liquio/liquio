import { ComponentType } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as actions from 'services/dataTable/actions';
import type { DataTableEndpoint } from 'services/dataTable/types';

type ActionMap = Record<string, unknown>;
type ActionCreators = Record<string, (endPoint: DataTableEndpoint) => unknown>;

export const mapStateToProps =
  ({ sourceName }: DataTableEndpoint) =>
  (state: Record<string, unknown>) =>
    state[sourceName];

export const mapDispatchToProps = (endPoint: DataTableEndpoint) => (dispatch: unknown) => ({
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

// This HOC wraps components with wildly varying own-prop shapes (across ~50 consumers), so the
// wrapped component's props stay a loose Record here rather than a generic that connect() would
// otherwise force every call site to satisfy exactly.
export default (endPoint: DataTableEndpoint) =>
  (component: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> =>
    connect(mapStateToProps(endPoint), mapDispatchToProps(endPoint))(component) as ComponentType<Record<string, unknown>>;
