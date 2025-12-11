import React from 'react';
import { translate } from 'react-translate';

import endPoint from 'application/endPoints/inboxFiles';
import ModulePage from 'components/ModulePage';
import dataTableConnect from 'services/dataTable/connect';
import InboxFileLayout from 'modules/inbox/pages/InboxFiles/components/InboxFileLayout';

class InboxFilesPage extends ModulePage {
  state = { busy: false };

  componentGetTitle() {
    const { inboxFile } = this.getData(this.props);
    return inboxFile && inboxFile.name;
  }

  componentDidMount() {
    super.componentDidMount();
    const { busy } = this.state;
    const {
      actions,
      match: {
        params: { inboxFileId }
      }
    } = this.props;

    if (busy) {
      return;
    }

    this.setState({ busy: true }, async () => {
      const { inboxFile } = this.getData(this.props);

      if (!inboxFile) {
        await actions.load();
      }

      this.setState({ busy: false });
    });

    actions.markInboxRead(inboxFileId);
  }

  getData = ({
    data,
    match: {
      params: { inboxFileId }
    }
  }) => ({
    inboxFileId,
    inboxFile: (data || []).find(({ id }) => id === inboxFileId)
  });

  render() {
    const { t, location } = this.props;
    const { inboxFile } = this.getData(this.props);

    return (
      <InboxFileLayout
        t={t}
        location={location}
        title={inboxFile ? inboxFile.name : t('Loading')}
        loading={!inboxFile}
        inboxFile={inboxFile}
      />
    );
  }
}

const translated = translate('InboxFilesPage')(InboxFilesPage);
export default dataTableConnect(endPoint)(translated);
