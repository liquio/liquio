import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';

import ItemRaw from 'layouts/components/Navigator/Item';
import processList from 'services/processList';
import { getUnitUnreadTaskCount } from 'application/actions/task';

const Item = ItemRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface UnitTaskNavigationProps {
  actions: { getUnitUnreadTaskCount: () => Promise<unknown> };
  location: { pathname: string };
  unreadUnitCount?: number;
}

class UnitTaskNavigation extends React.Component<UnitTaskNavigationProps> {
  componentDidMount() {
    const { actions } = this.props;

    if (!processList.has('getUnitUnreadTaskCount')) {
      processList.set('getUnitUnreadTaskCount', actions.getUnitUnreadTaskCount);
    }
  }

  render() {
    const {
      unreadUnitCount,
      location: { pathname }
    } = this.props;

    return (
      <Item
        menuItem={{
          id: 'UnitInboxTasks',
          title: 'UnitInboxTasks',
          path: '/tasks/unit-tasks',
          uiFilter: 'tasks.unit.opened',
          pathname,
          badge: unreadUnitCount
        }}
      />
    );
  }
}

interface TaskState {
  task: { unreadUnitCount?: number };
}

const mapStateToProps = ({ task }: TaskState) => task;
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getUnitUnreadTaskCount: bindActionCreators(getUnitUnreadTaskCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(UnitTaskNavigation as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
