import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';

import ItemRaw from 'layouts/components/Navigator/Item';
import processList from 'services/processList';
import { getMyUnreadTaskCount } from 'application/actions/task';

const Item = ItemRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface MyTaskNavigationProps {
  actions: { getMyUnreadTaskCount: () => Promise<unknown> };
  location: { pathname: string };
  unreadMyCount?: number;
}

class MyTaskNavigation extends React.Component<MyTaskNavigationProps> {
  componentDidMount() {
    const {
      actions,
      location: { pathname }
    } = this.props;

    if (pathname === '/tasks/my-tasks' && !processList.has('getMyUnreadTaskCount')) {
      processList.set('getMyUnreadTaskCount', actions.getMyUnreadTaskCount);
    }
  }

  render() {
    const {
      unreadMyCount,
      location: { pathname }
    } = this.props;

    return (
      <Item
        menuItem={{
          id: 'InboxTasks',
          title: 'InboxTasks',
          path: '/tasks/my-tasks',
          uiFilter: 'tasks.my.opened',
          pathname,
          badge: unreadMyCount
        }}
      />
    );
  }
}

interface TaskState {
  task: { unreadMyCount?: number };
}

const mapStateToProps = ({ task }: TaskState) => task;
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getMyUnreadTaskCount: bindActionCreators(getMyUnreadTaskCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(MyTaskNavigation as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
