import React from 'react';
import { translate } from 'react-translate';

import endPoint from 'application/endPoints/message';
import dataTableConnect from 'services/dataTable/connect';
import ModulePage from 'components/ModulePage';
import MessageLayout from 'modules/messages/pages/Message/components/MessageLayout';

class MessagePage extends ModulePage {
  componentGetTitle() {
    const message = this.getMessage();
    return message && message.titleMessage;
  }

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
    const pageTitle = !message ? t('Loading') : message.titleMessage;

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

const translated = translate('MessagePage')(MessagePage);
export default dataTableConnect(endPoint)(translated);
