import moment from 'moment';

import MessagePage from 'modules/messages/pages/Message';
import MessageListPage from 'modules/messages/pages/MessageList';
import MessagesNavigation from 'modules/messages/components/Navigation';
import { getConfig } from '../../../core/helpers/configLoader';

export default function getMessagesModule() {
  const config = getConfig();
  const messagesDateFilter = config.messagesDateFilter === true;

  return {
    routes: [
      {
        path: '/messages/:messageId',
        component: MessagePage
      },
      {
        path: '/messages',
        component: MessageListPage,
        title: 'InboxTitle',
        defaultFilters: {
          deleted: 0,
          from_created_at: messagesDateFilter
            ? moment().subtract(14, 'days').format('YYYY-MM-DD')
            : null,
          to_created_at: messagesDateFilter ? moment().format('YYYY-MM-DD') : null
        }
      }
    ],
    navigation: [
      {
        priority: 50,
        Component: MessagesNavigation
      }
    ]
  };
}
