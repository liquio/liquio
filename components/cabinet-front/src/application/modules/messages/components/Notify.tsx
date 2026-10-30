import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Badge, IconButton } from '@mui/material';
import NotificationIcon from '@mui/icons-material/NotificationImportant';

import { history } from 'store';

interface MessageNotifyProps {
  unreadCount?: number;
}

const MessageNotify = ({ unreadCount = 0 }: MessageNotifyProps) => (
  <IconButton onClick={() => history.push('/messages')}>
    <Badge badgeContent={unreadCount} color="primary">
      <NotificationIcon />
    </Badge>
  </IconButton>
);

interface MessagesState {
  messages: { unreadCount: number };
}

const mapStateToProps = ({ messages: { unreadCount } }: MessagesState) => ({ unreadCount });

const translated = translate('MessagesNotify')(MessageNotify as never);
export default connect(mapStateToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
