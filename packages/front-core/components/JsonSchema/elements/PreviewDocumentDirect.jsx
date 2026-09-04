import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import FileDataTable from 'components/FileDataTable';
import formElement from 'components/JsonSchema/components/formElement';
import * as api from 'services/api';
import { addError } from 'actions/error';
import processList from 'services/processList';

const PreviewDocumentDirect = ({
  onChange,
  hidden,
  stepName,
  path,
  fetchData,
  rootDocument,
  fileStorage,
  actions,
  addFetchError,
  defaultView,
  withPrint,
}) => {
  const [busy, setBusy] = React.useState(false);
  const [files, setFiles] = React.useState();
  const [error, setError] = React.useState();

  React.useEffect(() => {
    const updateData = async () => {
      setBusy(true);
      try {
        const controlPath = [stepName].concat(path).join('.properties.');
        const fetchedData = await processList.hasOrSet(
          controlPath,
          fetchData,
          rootDocument.id,
          controlPath,
        );
        setFiles(fetchedData);
        onChange(fetchedData);
      } catch (e) {
        setError(e);
        addFetchError(new Error('FailLoadingDocumentWorkflowFiles'));
      }
      setBusy(false);
    };
    if (!files && !error && !busy) {
      updateData();
    }
  }, [
    files,
    error,
    busy,
    stepName,
    path,
    fetchData,
    onChange,
    rootDocument.id,
    addFetchError,
  ]);

  return hidden ? null : (
    <FileDataTable
      defaultView={defaultView}
      data={error ? [] : files}
      fileStorage={fileStorage}
      showCreatedDate={true}
      actions={{
        handleDownloadFile: actions.handleDownloadFile,
      }}
      fieldBorder={false}
      withPrint={withPrint}
    />
  );
};

const mapDispatch = (dispatch) => ({
  addFetchError: bindActionCreators(addError, dispatch),
  fetchData: (documentId, path) =>
    api.get(
      `documents/${documentId}/workflow_files_direct?path=${path}`,
      'WORKFLOW_FILES_DIRECT',
      dispatch,
    ),
});

const connected = connect(null, mapDispatch)(PreviewDocumentDirect);
export default formElement(connected);
