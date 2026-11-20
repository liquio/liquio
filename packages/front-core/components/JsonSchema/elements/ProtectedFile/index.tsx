import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
// admin-front's own `application/actions/task` doesn't export these two
// (they're cabinet-front-only, citizen-facing protected-file actions); this
// component is only ever registered in cabinet-front's element registry, but
// both apps' tsconfig typecheck all of front-core, so resolve loosely here
// rather than requiring admin-front's task.ts to gain unused exports.
import * as taskActions from 'application/actions/task';
import { Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import FileDataTable from 'components/FileDataTable';
import SelectFileArea from '../SelectFiles/components/SelectFileArea';

type TaskActionFn = (...args: unknown[]) => unknown;
const downloadProtectedFile = (taskActions as unknown as Record<string, TaskActionFn>).downloadProtectedFile;
const uploadProtectedFile = (taskActions as unknown as Record<string, TaskActionFn>).uploadProtectedFile;

const useStyles = makeStyles(() => ({
  root: {
    marginTop: 10,
    marginBottom: 20,
  },
  label: {
    marginTop: 20,
  },
}));

interface Attach {
  attachId?: string | number;
  documentId?: string | number;
  link?: string;
  [key: string]: unknown;
}

interface ProtectedFileProps {
  hidden?: boolean;
  path: Array<string | number>;
  value?: Attach | Attach[] | null;
  description?: string;
  actions?: unknown;
  keyId: string | number;
  recordId: string | number;
  name?: string;
  sample?: string;
  maxSize?: number;
  accept?: string;
  readOnly?: boolean;
  onChange: (value: unknown) => void;
}

const ProtectedFile = (props: ProtectedFileProps) => {
  const dispatch = useDispatch();
  const classes = useStyles();

  const {
    hidden,
    path,
    value,
    description,
    keyId,
    recordId,
    name,
    sample,
    maxSize,
    accept,
    readOnly,
    onChange,
  } = props;

  const fileStorage = useSelector(({ files: { list } }: { files: { list: Record<string, unknown> } }) => list);

  const getValue = React.useCallback(() => {
    if (!value || Object.keys(value || {}).length === 0) return [] as Array<Attach & { id: unknown }>;

    const setAttachInfo = (attach: Attach) => ({
      ...attach,
      id: attach.attachId || attach.documentId,
    });

    if (value && Array.isArray(value))
      return value.map((item) => setAttachInfo(item));

    return [setAttachInfo(value as Attach)];
  }, [value]);

  const renderDataTable = React.useCallback(() => {
    const data = getValue();

    const handleDownloadFileAction = async (attach: Attach, p7s: boolean) => {
      return await dispatch(
        downloadProtectedFile({
          attachId: attach.attachId || attach.link,
          keyId,
          recordId,
          path: (['data'] as Array<string | number>).concat(path).join('.'),
          preview: false,
          p7s,
        }) as never,
      );
    };

    const handleDownloadFile = async (attach: Attach) => {
      return handleDownloadFileAction(attach, false);
    };

    const handleDownloadP7SFile = async (_: unknown, attach: Attach) => {
      return handleDownloadFileAction(attach, true);
    };

    const uploadFile = async (file: File[]) => {
      const acceptedFile = file.shift() as File;

      const uploadResult = (await dispatch(
        uploadProtectedFile({
          file: acceptedFile,
          file_name: acceptedFile.name,
        }) as never,
      )) as { link?: string; [key: string]: unknown };

      onChange({
        ...uploadResult,
        id: uploadResult.link,
      });
    };

    return (
      <>
        <SelectFileArea
          path={path}
          name={name}
          sample={sample}
          maxSize={maxSize}
          active={true}
          accept={accept}
          multiple={false}
          readOnly={readOnly}
          onSelect={uploadFile}
        />

        <FileDataTable
          data={data}
          admin={true}
          fileStorage={fileStorage}
          actions={{ handleDownloadFile, uploadFile, handleDownloadP7SFile }}
        />
      </>
    );
  }, [
    getValue,
    readOnly,
    fileStorage,
    path,
    keyId,
    name,
    maxSize,
    sample,
    accept,
    recordId,
  ]);

  if (hidden) return null;

  return (
    <div className={classes.root}>
      {description ? <Typography variant="h5">{description}</Typography> : null}
      {renderDataTable()}
    </div>
  );
};

export default ProtectedFile;
