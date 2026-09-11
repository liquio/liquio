import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import CategoryHeaderRaw from 'layouts/components/Navigator/CategoryHeader';
import { getUnreadMessageCount } from 'application/actions/messages';
import { ReactComponent as MessageOutlinedIcon } from 'assets/img/modulesIcons/message-outlined.svg';

const CategoryHeader = CategoryHeaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface MessageNavigationProps {
  unreadCount?: number;
  location?: { pathname: string };
}

const MessageNavigation = (props: MessageNavigationProps) => {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [pathname, setPathname] = React.useState('');

  React.useEffect(() => {
    setUnreadCount(props.unreadCount as number);
    setPathname((props.location as { pathname: string }).pathname);
  }, [props.unreadCount, props.location?.pathname]);

  return (
    <CategoryHeader
      id="Messages"
      path="/messages"
      pathname={pathname}
      badge={unreadCount}
      icon={<MessageOutlinedIcon />}
    />
  );
};

MessageNavigation.defaultProps = {
  location: { pathname: '' },
  unreadCount: 0
};

interface MessagesState {
  messages: { unreadCount: number };
}

const mapStateToProps = ({ messages: { unreadCount } }: MessagesState) => ({ unreadCount });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getUnreadMessageCount: bindActionCreators(getUnreadMessageCount, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(MessageNavigation as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
