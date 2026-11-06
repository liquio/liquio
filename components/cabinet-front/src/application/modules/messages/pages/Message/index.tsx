import React from 'react';
import { translate } from 'react-translate';

import endPoint from 'application/endPoints/message';
import dataTableConnect from 'services/dataTable/connect';
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import MessageLayoutRaw from 'modules/messages/pages/Message/components/MessageLayout';

const MessageLayout = MessageLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface MessageRow {
  id: number;
  titleMessage?: string;
  [key: string]: unknown;
}

interface MessagePageProps extends ModulePageProps {
  actions: { load: () => void; markMessageRead: (messageId: string) => void };
  data?: MessageRow[];
  match: { params: { messageId: string } };
  loading?: boolean;
  location: unknown;
}

class MessagePage extends ModulePage<MessagePageProps> {
  componentGetTitle = () => {
    const message = this.getMessage();
    return (message && message.titleMessage) as string;
  };

  componentDidMount() {
    super.componentDidMount();
    const {
      actions,
      data,
      match: {
        params: { messageId }
      }
    } = this.props;
    if (!data) {
      actions.load();
    }

    actions.markMessageRead(messageId);
  }

  getMessage = () => {
    const {
      data,
      match: {
        params: { messageId }
      }
    } = this.props;
    return data && data.find(({ id }) => id === parseInt(messageId, 10));
  };

  render() {
    const { t, loading, location } = this.props;

    const message = this.getMessage();
    const pageTitle = !message ? t?.('Loading') : message.titleMessage;

    return (
      <MessageLayout
        t={t}
        location={location}
        title={pageTitle}
        loading={loading}
        message={message}
      />
    );
  }
}

const translated = translate('MessagePage')(MessagePage as never);
export default dataTableConnect(endPoint)(translated as never);
