/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { connect } from 'react-redux';
import Alert from '@mui/material/Alert';
import withStyles from '@mui/styles/withStyles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';
import useStickyState from 'helpers/useStickyState';
import SmartMessage from 'modules/messages/pages/Message/components/SmartMessage';

const styles = {
  root: {
    width: '100%',
    '& > *': {
      margin: 4
    }
  }
};

const ImportantMessages = ({ classes, setMessageHidden }: any) => {
  const [messages, setMessages] = useStickyState<any[]>([], 'importantMessages');
  const [deleted, setDeleted] = React.useState<any[]>([]);

  const { data } = useTable({
    dataURL: 'important-messages',
    sourceName: 'importantMessages',
    autoLoad: true,
    timeout: 500
  });

  React.useEffect(() => {
    if (data && Array.isArray(data)) {
      setMessages(data.filter(({ messageId }: any) => !deleted.includes(messageId)));
    }
  }, [data, deleted, setMessages]);

  const closeMessage = (messageId: any) => async () => {
    setDeleted(deleted.concat(messageId));

    try {
      setMessageHidden(messageId);
    } catch (e) {
      // Nothing to do
    }
  };

  return (
    <div className={classes.root}>
      {messages.filter(Boolean).map((message: any, key: number) => (
        <Alert
          key={key}
          severity={message.allowHide ? 'info' : 'warning'}
          icon={<InfoOutlinedIcon fontSize="inherit" />}
          onClose={message.allowHide ? closeMessage(message.messageId) : undefined}
        >
          <SmartMessage template={message.fullMessage} message={message} />
        </Alert>
      ))}
    </div>
  );
};

const mapDispatch = (dispatch: any) => ({
  setMessageHidden: (messageId: any) =>
    api.put(`important-messages/${messageId}/hide`, {}, 'HIDE_IMPORTANT_MESSAGE', dispatch, {
      messageId
    })
});

const styled = withStyles(styles as any)(ImportantMessages as any);
export default connect(null, mapDispatch)(styled);
