import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import {
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Typography,
} from '@mui/material';

import withStyles from '@mui/styles/withStyles';

import BlockScreen from 'components/BlockScreen';
import setComponentsId from 'helpers/setComponentsId';

import cx from 'classnames';

import VerifiedDialog from './VerifiedDialog';
import SelectFilesDialogContent from './SelectFilesDialogContent';

const defaultFileLimit = {
  types: {
    total: 'image',
    formats: ['application/pdf'],
  },
  accept: 'image/*,application/pdf',
  maxSize: 10485760,
};

class SelectFilesDialog extends React.Component {
  state = {
    file: null,
    name: '',
    busy: false,
    showEmptyNameError: false,
    error: false,
    openVerifiedDialog: false,
  };

  onDrop = (files, rejected) => {
    const { t } = this.props;
    let error = '';
    if (rejected.length) {
      const { fileLimit } = this.props;
      const rejectedFile = rejected.shift();
      const { maxSize } = fileLimit || this.props;

      if (maxSize < rejectedFile.size) {
        error = t('ERROR_SIZE_FILE', {
          maxSize: (maxSize / 1048576).toFixed(1),
        });
      } else {
        error = t('ERROR_TYPE_FILE');
      }
    } else {
      const file = files.shift();
      if (!file) {
        error = t('ERROR_TYPE_FILE');
      } else {
        this.setState({ file, name: file.name });
      }
    }
    this.setState({ error });
  };

  handleChange = ({ target }) =>
    this.setState({
      name: target.value,
      error: false,
      showEmptyNameError: false,
    });
  removeFile = () => this.setState({ file: null });

  uploadFile = async () => {
    const { t, uploadAction, onUpload, fileName } = this.props;
    const { file, name } = this.state;
    this.setState(
      { error: null, busy: true, openVerifiedDialog: false },
      async () => {
        try {
          const data = await uploadAction(file);
          if (!data) {
            throw new Error(t('ERROR_UPLOADING_FILE'));
          }

          const { fileLink, attachId, link } = data;

          if (
            (!(link || fileLink) && fileName === 'doc') ||
            (!attachId && fileName !== 'doc')
          ) {
            throw new Error(t('ERROR_UPLOADING_FILE'));
          }

          onUpload({
            attachId,
            fileLink: fileLink || link,
            name,
            fileName: file.name,
            size: file.size,
            mimeType: file.type,
          });
          return this.setState({ file: null, name: '', busy: false });
        } catch (e) {
          return this.setState({ error: e.message, busy: false });
        }
      },
    );
  };

  toggleVerifiedDialog = () =>
    this.setState({ openVerifiedDialog: !this.state.openVerifiedDialog });

  handleDone = () => {
    const { uploadAction, onUpload, claim } = this.props;
    const { name } = this.state;
    if (!uploadAction || !onUpload) {
      return;
    }

    if (!name) {
      this.setState({ showEmptyNameError: true });
    } else if (claim) {
      this.toggleVerifiedDialog();
    } else this.uploadFile();
  };

  handleClose = () => {
    const { busy } = this.state;
    if (busy) {
      return;
    }
    const { handleClose } = this.props;
    handleClose && handleClose();
    this.setState({ file: null, name: '' });
  };

  render() {
    const {
      t,
      classes,
      open,
      accept,
      maxSize,
      fileName,
      setId,
      fileLimit,
      claim,
    } = this.props;
    const { file, showEmptyNameError, busy, name, error, openVerifiedDialog } =
      this.state;
    const getCurrentTitle = (title) =>
      t(`${title}${fileName ? `_${fileName.toUpperCase()}` : ''}`);

    return (
      <Dialog
        fullWidth={true}
        open={open}
        onClose={this.handleClose}
        aria-labelledby="responsive-dialog-title"
        id={setId('')}
        className={classes.dialog}
      >
        <DialogTitle
          id={setId('title responsive-dialog-title')}
          className={classes.dialogContentWrappers}
        >
          {getCurrentTitle('UPLOAD_FILE')}
        </DialogTitle>
        <SelectFilesDialogContent
          classes={classes}
          setId={setId}
          t={t}
          busy={busy}
          handleChange={this.handleChange}
          getCurrentTitle={getCurrentTitle}
          itIsClaim={claim}
          name={name}
          showEmptyNameError={showEmptyNameError}
          file={file}
          removeFile={this.removeFile}
          accept={accept}
          fileLimit={fileLimit}
          maxSize={maxSize}
          onDrop={this.onDrop}
        />
        <DialogActions
          className={cx(classes.actions, classes.dialogContentWrappers)}
          id={setId('actions')}
        >
          {error && (
            <Typography
              className={classes.flex}
              align="left"
              color="error"
              id={setId('error')}
            >
              {error}
            </Typography>
          )}
          <Button
            disabled={busy || !file || !!error}
            onClick={this.handleDone}
            color="yellow"
            id={setId('save-button')}
            setId={(elementName) => setId(`save-${elementName}`)}
          >
            {t('SAVE')}
          </Button>
        </DialogActions>
        <VerifiedDialog
          toggleVerifiedDialog={this.toggleVerifiedDialog}
          openVerifiedDialog={openVerifiedDialog}
          setId={setId}
          classes={classes}
          t={t}
          name={name}
          uploadFile={this.uploadFile}
        />
        <BlockScreen open={busy} />
      </Dialog>
    );
  }
}

SelectFilesDialog.propTypes = {
  uploadAction: PropTypes.func,
  onUpload: PropTypes.func,
  fileName: PropTypes.string,
  fileLimit: PropTypes.object,
  t: PropTypes.func.isRequired,
  handleClose: PropTypes.func,
  classes: PropTypes.object.isRequired,
  open: PropTypes.bool,
  accept: PropTypes.string,
  setId: PropTypes.func,
  maxSize: PropTypes.number,
  claim: PropTypes.bool,
};

SelectFilesDialog.defaultProps = {
  uploadAction: undefined,
  onUpload: undefined,
  fileName: undefined,
  fileLimit: defaultFileLimit,
  handleClose: undefined,
  open: false,
  accept: undefined,
  setId: setComponentsId('select-files-dialog'),
  maxSize: undefined,
  claim: false,
};

const styled = withStyles({})(SelectFilesDialog);

// decorate and export
export default translate('Elements')(styled);
