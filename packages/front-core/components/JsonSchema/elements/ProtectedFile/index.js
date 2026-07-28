import React from 'react';
import { useSelector , useDispatch } from 'react-redux';
import {
  downloadProtectedFile,
  uploadProtectedFile,
} from 'application/actions/task';
import { Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import FileDataTable from 'components/FileDataTable';
import SelectFileArea from '../SelectFiles/components/SelectFileArea';

const useStyles = makeStyles(() => ({
  root: {
    marginTop: 10,
    marginBottom: 20,
  },
  label: {
    marginTop: 20,
  },
}));

const ProtectedFile = (props) => {
  const dispatch = useDispatch();
  const classes = useStyles();

  const {
    hidden,
    path,
    value,
    description,
    actions,
    keyId,
    recordId,
    name,
    sample,
    maxSize,
    accept,
    readOnly,
    onChange,
  } = props;

  const fileStorage = useSelector(({ files: { list } }) => list);

  const getValue = React.useCallback(() => {
    if (!value || Object.keys(value || {}).length === 0) return [];

    const setAttachInfo = (attach) => ({
      ...attach,
      id: attach.attachId || attach.documentId,
    });

    if (value && Array.isArray(value))
      return value.map((item) => setAttachInfo(item));

    return [setAttachInfo(value)];
  }, [value]);

  const renderDataTable = React.useCallback(() => {
    const data = getValue();

    const handleDownloadFileAction = async (attach, p7s) => {
      return await dispatch(
        downloadProtectedFile({
          attachId: attach.attachId || attach.link,
          keyId,
          recordId,
          path: ['data'].concat(path).join('.'),
          preview: false,
          p7s,
        }),
      );
    };

    const handleDownloadFile = async (attach) => {
      return handleDownloadFileAction(attach, false);
    };

    const handleDownloadP7SFile = async (_, attach) => {
      return handleDownloadFileAction(attach, true);
    };

    const uploadFile = async (file) => {
      const acceptedFile = file.shift();

      const uploadResult = await dispatch(
        uploadProtectedFile({
          file: acceptedFile,
          file_name: acceptedFile.name,
        }),
      );

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
    actions,
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
