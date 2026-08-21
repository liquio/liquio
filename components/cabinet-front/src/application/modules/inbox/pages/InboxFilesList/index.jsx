import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';

import asModulePage from 'hooks/asModulePage';
import endPoint from 'application/endPoints/inboxFiles';
import processList from 'services/processList';
import { load } from 'services/dataTable/actions';
import InboxFileListLayout from 'modules/inbox/pages/InboxFilesList/components/InboxFileListLayout';

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
}) => {
  const init = React.useCallback(
    (refresh) => {
      if ((data || error) && !refresh) {
        return;
      }
      actions.load();
    },
    [actions, data, error]
  );

  const handleItemClick = React.useCallback(
    ({ id }) => {
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

const translated = translate('InboxFilesListPage')(InboxFilesListPage);

const asModule = asModulePage(translated);

const mapStateToProps = ({
  inboxFilesList: { loading, data, error },
  files: { pdfDocuments }
}) => ({ loading, data, error, fileStorage: pdfDocuments });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    load: bindActionCreators(load(endPoint), dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(asModule);
