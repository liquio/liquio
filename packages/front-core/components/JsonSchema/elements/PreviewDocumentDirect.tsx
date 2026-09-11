import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import FileDataTableUntyped from 'components/FileDataTable';
import formElement from 'components/JsonSchema/components/formElement';
import * as api from 'services/api';
import { addError } from 'actions/error';
import processList from 'services/processList';

const FileDataTable = FileDataTableUntyped as unknown as React.ComponentType<Record<string, unknown>>;

interface PreviewDocumentDirectProps {
  onChange: (files: unknown) => void;
  hidden?: boolean;
  stepName?: string;
  path: Array<string | number>;
  fetchData: (documentId: unknown, path: string) => Promise<unknown>;
  rootDocument: { id?: string | number };
  fileStorage?: unknown;
  actions: { handleDownloadFile?: (...args: unknown[]) => unknown };
  addFetchError: (error: unknown) => void;
  defaultView?: string;
  withPrint?: boolean;
}

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
}: PreviewDocumentDirectProps) => {
  const [busy, setBusy] = React.useState(false);
  const [files, setFiles] = React.useState<unknown>();
  const [error, setError] = React.useState<unknown>();

  React.useEffect(() => {
    const updateData = async () => {
      setBusy(true);
      try {
        const controlPath = ([stepName, ...path] as Array<string | number | undefined>).join(
          '.properties.',
        );
        const fetchedData = await processList.hasOrSet(
          controlPath,
          fetchData as never,
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

const mapDispatch = (dispatch: Dispatch) => ({
  addFetchError: bindActionCreators(addError as never, dispatch as never),
  fetchData: (documentId: unknown, path: string) =>
    api.get(
      `documents/${documentId}/workflow_files_direct?path=${path}`,
      'WORKFLOW_FILES_DIRECT',
      dispatch as never,
    ),
});

const connected = connect(null, mapDispatch)(PreviewDocumentDirect as never);
export default formElement(connected as unknown as React.ComponentType<Record<string, unknown>>);
