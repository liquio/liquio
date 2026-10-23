import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';

import CategoryHeaderRaw from 'layouts/components/Navigator/CategoryHeader';
import processList from 'services/processList';
import { getUnreadInboxCount } from 'application/actions/inbox';
import { ReactComponent as InsertDriveFileIcon } from 'assets/img/modulesIcons/insert-drive-outlined.svg';

const CategoryHeader = CategoryHeaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InboxNavigationProps {
  actions: { getUnreadInboxCount: () => Promise<unknown> };
  location: { pathname: string };
  unreadCount?: number;
}

class InboxNavigation extends React.Component<InboxNavigationProps> {
  componentDidMount() {
    const {
      actions,
      location: { pathname }
    } = this.props;

    if (pathname === '/inbox' && !processList.has('getUnreadInboxCount')) {
      processList.set('getUnreadInboxCount', actions.getUnreadInboxCount);
    }
  }

  render() {
    const {
      unreadCount,
      location: { pathname }
    } = this.props;

    return (
      <CategoryHeader
        id="Inbox"
        path="/workflow/inbox"
        pathname={pathname}
        badge={unreadCount}
        icon={<InsertDriveFileIcon />}
      />
    );
  }
}

interface InboxState {
  unreadCount?: number;
}

const mapStateToProps = ({ inbox }: { inbox: InboxState }) => inbox;
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getUnreadInboxCount: bindActionCreators(getUnreadInboxCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(InboxNavigation as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
