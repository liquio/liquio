import React from 'react';
import { translate } from 'react-translate';

import endPoint from 'application/endPoints/inboxFiles';
import ModulePage from 'components/ModulePage';
import dataTableConnect from 'services/dataTable/connect';
import InboxFileLayoutRaw from 'modules/inbox/pages/InboxFiles/components/InboxFileLayout';

const InboxFileLayout = InboxFileLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InboxFile {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

interface InboxFilesPageProps {
  actions: { load: () => Promise<unknown>; markInboxRead: (id: string) => unknown };
  data?: InboxFile[];
  match: { params: { inboxFileId: string } };
  t: (key: string) => string;
  location: unknown;
}

interface InboxFilesPageState {
  busy: boolean;
}

class InboxFilesPage extends ModulePage<InboxFilesPageProps> {
  state: InboxFilesPageState = { busy: false };

  // Declared as a property (arrow function), not a method: the base class
  // (`ModulePage`) types this as an optional property of a fixed
  // `(params: { returnTitle: boolean }) => string` shape. The original
  // never used `params` and could return `undefined` (via `inboxFile &&
  // inboxFile.name`) — preserved via a cast rather than threading a
  // guaranteed-string return through.
  componentGetTitle = () => {
    const { inboxFile } = this.getData(this.props);
    return (inboxFile && inboxFile.name) as string;
  };

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
  }: InboxFilesPageProps) => ({
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

const translated = translate('InboxFilesPage')(InboxFilesPage as never);
export default dataTableConnect(endPoint)(translated as never);
