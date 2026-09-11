import React from 'react';
import PropTypes from 'prop-types';
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
  file,
  removeFile,
  accept,
  fileLimit,
  maxSize,
  onDrop,
  readOnly,
}) => (
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
              {file.name}
            </Typography>
            <Typography
              variant="subtitle1"
              color="textSecondary"
              id={setId('file-size')}
            >
              {filesize(file.size)}
            </Typography>
          </CardContent>
        </Card>
      )}
      {!file && (
        <SelectFileArea
          accept={accept || fileLimit.accept}
          maxSize={maxSize || fileLimit.maxSize}
          multiple={false}
          onDrop={onDrop}
          readOnly={readOnly}
          setId={(elementName) => setId(`-area-${elementName}`)}
        />
      )}
    </FormControl>
  </DialogContent>
);

SelectFilesDialogContent.propTypes = {
  setId: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  handleChange: PropTypes.func.isRequired,
  fileLimit: PropTypes.object,
  t: PropTypes.func.isRequired,
  getCurrentTitle: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  itIsClaim: PropTypes.bool.isRequired,
  accept: PropTypes.string,
  maxSize: PropTypes.number,
  name: PropTypes.string.isRequired,
  showEmptyNameError: PropTypes.bool.isRequired,
  file: PropTypes.object,
  removeFile: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
};

SelectFilesDialogContent.defaultProps = {
  file: null,
  accept: undefined,
  maxSize: undefined,
  fileLimit: null,
  readOnly: false,
};

export default SelectFilesDialogContent;
