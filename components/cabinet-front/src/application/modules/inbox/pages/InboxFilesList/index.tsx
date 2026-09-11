import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';

import asModulePage from 'hooks/asModulePage';
import endPoint from 'application/endPoints/inboxFiles';
import processList from 'services/processList';
import { load } from 'services/dataTable/actions';
import InboxFileListLayoutRaw from 'modules/inbox/pages/InboxFilesList/components/InboxFileListLayout';

const InboxFileListLayout = InboxFileListLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface InboxFilesListPageProps {
  actions: { load: () => void };
  data?: unknown[];
  error?: unknown;
  history: { push: (url: string) => void };
  t: (key: string) => string;
  title: string;
  loading?: boolean;
  location: unknown;
  fileStorage?: Record<string, unknown>;
}

const InboxFilesListPage = ({
  actions,
  data,
  error,
  history,
  t,
  title,
  loading,
  location,
  fileStorage
}: InboxFilesListPageProps) => {
  const init = React.useCallback(
    (refresh?: boolean) => {
      if ((data || error) && !refresh) {
        return;
      }
      actions.load();
    },
    [actions, data, error]
  );

  const handleItemClick = React.useCallback(
    ({ id }: { id: string }) => {
      history.push(`/workflow/inbox/${id}`);
    },
    [history]
  );

  React.useEffect(() => {
    processList.hasOrSet('inboxFilesListInit', () => init());
  }, [init]);

  return (
    <InboxFileListLayout
      data={data}
      location={location}
      title={t(title)}
      loading={loading}
      fileStorage={fileStorage}
      handleItemClick={handleItemClick}
    />
  );
};

const translated = translate('InboxFilesListPage')(InboxFilesListPage as never);

const asModule = asModulePage(translated as never);

interface InboxFilesListState {
  inboxFilesList: { loading?: boolean; data?: unknown[]; error?: unknown };
  files: { pdfDocuments: Record<string, unknown> };
}

const mapStateToProps = ({
  inboxFilesList: { loading, data, error },
  files: { pdfDocuments }
}: InboxFilesListState) => ({ loading, data, error, fileStorage: pdfDocuments });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    load: bindActionCreators(load(endPoint), dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(asModule as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
