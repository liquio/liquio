import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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
import PreloaderUntyped from 'components/Preloader';
import FileDataTableUntyped from 'components/FileDataTable';
import ConfirmDialogUntyped from 'components/ConfirmDialog';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';
import { addError } from 'actions/error';
import { uploadFile } from 'application/actions/files';
import SelectFileArea from './SelectFiles/components/SelectFileArea';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const Preloader = PreloaderUntyped as unknown as React.ComponentType<Record<string, unknown>>;
const FileDataTable = FileDataTableUntyped as unknown as React.ComponentType<Record<string, unknown>>;
const ConfirmDialog = ConfirmDialogUntyped as unknown as React.ComponentType<Record<string, unknown>>;

interface UploadedFile {
  id?: unknown;
  fileLink?: unknown;
  url?: unknown;
  name?: string;
  type?: string;
  link?: string;
  [key: string]: unknown;
}

interface FileProps {
  t: (key: string) => string;
  value?: UploadedFile | UploadedFile[] | null;
  actions: {
    addError: (error: unknown) => void;
    uploadFile: (file: File) => Promise<{ fileId: unknown; url: string }>;
  };
  hidden?: boolean;
  path: string | Array<string | number>;
  name?: string;
  sample?: string;
  maxSize?: number;
  accept?: string;
  readOnly?: boolean;
  onChange: (value: unknown) => void;
  error?: unknown;
  description?: string;
  required?: boolean;
  notRequiredLabel?: string;
  type?: string;
}

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
}: FileProps) => {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<unknown>(error);
  const [openErrorDialog, setOpenErrorDialog] = React.useState(false);
  const isArrayOfFiles = type === 'array';
  const updatedFiles = isArrayOfFiles
    ? (value as UploadedFile[])?.map((file) => {
        if (!file.id) {
          return {
            ...file,
            id: file?.id || file?.fileLink || file?.url,
          };
        }
        return file;
      })
    : value;
  const [uploadFileList, setUploadFileList] = React.useState<UploadedFile | UploadedFile[]>(
    updatedFiles || [],
  );

  if (hidden) return null;

  const files = ([] as UploadedFile[])
    .concat(uploadFileList)
    .filter(Boolean)
    .filter((file) => Object.keys(file).length > 0);

  const onSelectFiles = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) {
      setErrors(new Error(t('FileSizeLimitReached')));
      setOpenErrorDialog(true);
      return;
    }

    const acceptedFile = acceptedFiles.shift() as File;

    setBusy(true);

    try {
      const uploadResult = await actions.uploadFile(acceptedFile);

      const uploadedFile: UploadedFile = {
        id: uploadResult.fileId,
        name: acceptedFile.name,
        type: acceptedFile.type,
        link: uploadResult.url,
      };
      if (isArrayOfFiles) {
        const newList = (uploadFileList as UploadedFile[]).concat(uploadedFile);
        setUploadFileList(newList);

        onChange(newList);
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
  const handleDeleteFile = (file: UploadedFile) => {
    const newFiles = (uploadFileList as UploadedFile[]).filter((item) => item.id !== file.id);
    setUploadFileList(newFiles);
    onChange(newFiles);
  };

  const renderForm = () => (
    <FormControl id={path as never} variant="standard" error={!!error}>
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
        path={path as never}
        name={name as never}
        sample={sample as never}
        maxSize={maxSize as never}
        active={true}
        accept={accept as never}
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
            ? (file: UploadedFile) => handleDeleteFile(file)
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
              path={path as never}
              name={name as never}
              sample={sample as never}
              maxSize={maxSize as never}
              accept={accept as never}
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
        description={(errors as { message?: string })?.message}
        handleClose={() => setOpenErrorDialog(false)}
      />
      {error ? (
        <FormHelperText>
          <EJVError error={error as never} />
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    addError: bindActionCreators(addError as never, dispatch as never),
    uploadFile: bindActionCreators(uploadFile as never, dispatch as never),
  },
});

const translated = translate('Elements')(File as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
