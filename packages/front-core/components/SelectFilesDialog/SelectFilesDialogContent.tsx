import React from 'react';
import {
  FormControl,
  TextField,
  DialogContent,
  Card,
  CardContent,
  Typography,
  IconButton,
  Icon,
} from '@mui/material';

import SelectFileArea from 'components/SelectFileArea';

import filesize from 'filesize';
import cx from 'classnames';

export interface FileLimit {
  types?: { total?: string; formats?: string[] };
  accept?: string;
  maxSize?: number;
}

interface SelectFilesDialogContentProps {
  classes: Record<string, string>;
  setId: (elementName: string) => string;
  t: (key: string, params?: Record<string, unknown>) => string;
  busy: boolean;
  handleChange: (event: { target: { value: string } }) => void;
  getCurrentTitle: (title: string) => string;
  itIsClaim?: boolean;
  name: string;
  showEmptyNameError: boolean;
  file?: File | null;
  removeFile: () => void;
  accept?: string;
  fileLimit?: FileLimit | null;
  maxSize?: number;
  onDrop: (files: File[], rejected: File[]) => void;
  readOnly?: boolean;
}

const SelectFilesDialogContent = ({
  classes,
  setId,
  t,
  busy,
  handleChange,
  getCurrentTitle,
  itIsClaim,
  name,
  showEmptyNameError,
  file = null,
  removeFile,
  accept,
  fileLimit = null,
  maxSize,
  onDrop,
  readOnly = false,
}: SelectFilesDialogContentProps) => (
  <DialogContent
    className={cx(classes.content, classes.dialogContentWrappers)}
    id={setId('content')}
  >
    <FormControl
      variant="standard"
      fullWidth={true}
      className={classes.formControl}
      id={setId('form')}
    >
      <TextField
        variant="standard"
        disabled={busy}
        onChange={handleChange}
        label={getCurrentTitle('FILE_TITLE')}
        helperText={
          <span>
            {getCurrentTitle('FILE_TITLE_HINT')}
            {itIsClaim && (
              <span>
                .&nbsp;
                <span className={classes.error}>
                  {t('FILE_TITLE_HINT_DESCRIPTION')}
                </span>
              </span>
            )}
          </span>
        }
        value={name}
        error={showEmptyNameError}
        id={setId('text-input')}
      />
      {!file && (
        <Card className={classes.card} id={setId('card')}>
          <CardContent
            className={classes.cardContent}
            id={setId('card-content')}
          >
            {!busy && (
              <IconButton
                className={classes.removeFileBtn}
                onClick={removeFile}
                id={setId('close-button')}
                size="large"
              >
                <Icon>close</Icon>
              </IconButton>
            )}
            <Typography
              variant="h5"
              className={classes.heading}
              id={setId('file-name')}
            >
              {(file as unknown as File).name}
            </Typography>
            <Typography
              variant="subtitle1"
              color="textSecondary"
              id={setId('file-size')}
            >
              {filesize((file as unknown as File).size)}
            </Typography>
          </CardContent>
        </Card>
      )}
      {!file && (
        <SelectFileArea
          accept={accept || fileLimit?.accept}
          maxSize={maxSize || fileLimit?.maxSize}
          multiple={false}
          onDrop={onDrop as unknown as (files: File[]) => void}
          {...({ readOnly } as unknown as Record<string, unknown>)}
          setId={(elementName: string) => setId(`-area-${elementName}`)}
        />
      )}
    </FormControl>
  </DialogContent>
);

export default SelectFilesDialogContent;
