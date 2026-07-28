import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  FormControl,
  FormLabel,
} from '@mui/material';
import EJVError from 'components/JsonSchema/components/EJVError';
import Preloader from 'components/Preloader';
import FileDataTable from 'components/FileDataTable';
import ConfirmDialog from 'components/ConfirmDialog';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';
import { addError } from 'actions/error';
import { uploadFile } from 'application/actions/files';
import SelectFileArea from './SelectFiles/components/SelectFileArea';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const File = ({
  t,
  value,
  actions,
  hidden,
  path,
  name,
  sample,
  maxSize,
  accept,
  readOnly,
  onChange,
  error,
  description,
  required,
  notRequiredLabel,
  type,
}) => {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState(error);
  const [openErrorDialog, setOpenErrorDialog] = React.useState(false);
  const isArrayOfFiles = type === 'array';
  const updatedFiles = isArrayOfFiles
    ? value?.map((file) => {
        if (!file.id) {
          return {
            ...file,
            id: file?.id || file?.fileLink || file?.url,
          };
        }
        return file;
      })
    : value;
  const [uploadFileList, setUploadFileList] = React.useState(
    updatedFiles || [],
  );

  if (hidden) return null;

  const files = []
    .concat(uploadFileList)
    .filter(Boolean)
    .filter((file) => Object.keys(file).length > 0);

  const onSelectFiles = async (acceptedFiles) => {
    if (!acceptedFiles.length) {
      setErrors(new Error(t('FileSizeLimitReached')));
      setOpenErrorDialog(true);
      return;
    }

    const acceptedFile = acceptedFiles.shift();

    setBusy(true);

    try {
      const uploadResult = await actions.uploadFile(acceptedFile);

      const uploadedFile = {
        id: uploadResult.fileId,
        name: acceptedFile.name,
        type: acceptedFile.type,
        link: uploadResult.url,
      };
      if (isArrayOfFiles) {
        setUploadFileList(uploadFileList.concat(uploadedFile));

        onChange(uploadFileList.concat(uploadedFile));
      } else {
        setUploadFileList(uploadedFile);
        onChange(uploadedFile);
      }
      setOpen(false);
    } catch (e) {
      // error handler
    }

    setBusy(false);
  };
  const handleDeleteFile = (file) => {
    const newFiles = uploadFileList.filter((item) => item.id !== file.id);
    setUploadFileList(newFiles);
    onChange(newFiles);
  };

  const renderForm = () => (
    <FormControl id={path} variant="standard" error={!!error}>
      {description ? (
        <FormLabel component="legend" style={{ marginBottom: 10 }}>
          <FieldLabel
            description={description}
            required={required}
            notRequiredLabel={notRequiredLabel}
          />
        </FormLabel>
      ) : null}

      <SelectFileArea
        path={path}
        name={name}
        sample={sample}
        maxSize={maxSize}
        active={true}
        accept={accept}
        multiple={false}
        readOnly={readOnly}
        onSelect={onSelectFiles}
      />

      <FileDataTable
        data={files}
        fileControl={true}
        directDownload={true}
        readOnly={readOnly}
        isArrayOfFiles={isArrayOfFiles}
        handleDeleteFile={
          readOnly
            ? null
            : isArrayOfFiles
            ? (file) => handleDeleteFile(file)
            : () => onChange({})
        }
        controls={{
          pagination: false,
          toolbar: true,
          search: false,
          header: true,
          refresh: false,
          switchView: true,
          customizateColumns: false,
        }}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth={true}
        maxWidth="md"
      >
        <DialogTitle>{t('UploadFiles')}</DialogTitle>
        <DialogContent>
          {busy ? (
            <Preloader />
          ) : (
            <SelectFileArea
              path={path}
              name={name}
              sample={sample}
              maxSize={maxSize}
              accept={accept}
              multiple={false}
              readOnly={readOnly}
              onSelect={onSelectFiles}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy}
            onClick={() => setOpen(false)}
            aria-label={t('Close')}
          >
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={openErrorDialog}
        title={t('Error')}
        description={errors && errors.message}
        handleClose={() => setOpenErrorDialog(false)}
      />
      {error ? (
        <FormHelperText>
          <EJVError error={error} />
        </FormHelperText>
      ) : null}
    </FormControl>
  );

  return isArrayOfFiles ? (
    <ElementContainer sample={sample} required={required} bottomSample={true}>
      {renderForm()}
    </ElementContainer>
  ) : (
    renderForm()
  );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    addError: bindActionCreators(addError, dispatch),
    uploadFile: bindActionCreators(uploadFile, dispatch),
  },
});

const translated = translate('Elements')(File);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
