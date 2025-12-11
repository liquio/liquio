import React from 'react';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import { makeStyles } from '@mui/styles';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import { translate } from 'react-translate';

import { ReactComponent as VisibilityIconAlt } from '../../assets/ic_visibility.svg';
import FileViewerDialog from 'components/FileViewerDialog';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';

const useStyles = makeStyles(() => ({
  modal: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  paper: {
    backgroundColor: '#F0F2F4',
    width: '100%',
    maxWidth: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 16
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '16px 16px 24px 16px',
    '& > button:nth-of-type(1)': {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      display: 'flex',
      justifyContent: 'flex-start',
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
    },
    '& > button:nth-of-type(2)': {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      display: 'flex',
      justifyContent: 'flex-start'
    }
  },
  download: {
    backgroundColor: '#fff',
    color: '#000',
    boxShadow: 'none',
    '&:active': {
      backgroundColor: 'transparent'
    },
    '&:hover': {
      backgroundColor: '#fff'
    }
  },
  closeIcon: {
    marginRight: 10,
    color: '#000'
  },
  buttonIcon: {
    marginRight: 10
  }
}));

const FileModal = (props) => {
  const { t, item, itemId, fileStorage, handleDownloadFile, darkTheme } = props;

  const [openModal, setOpenModal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const classes = useStyles();

  const getFile = React.useMemo(() => {
    return () => {
      if (itemId) return fileStorage[itemId];
      return (fileStorage || {})[item.id] || (fileStorage || {})[item.downloadToken];
    };
  }, [fileStorage, itemId, item.id, item.downloadToken]);

  const showPreviewDialog = React.useMemo(() => {
    return async () => {
      if (loading) return;

      if (getFile()) {
        setShowPreview(true);
        return;
      }

      setLoading(true);

      await handleDownloadFile(item);

      setLoading(false);

      setShowPreview(true);
    };
  }, [loading, getFile, handleDownloadFile, item]);

  const handleDownload = async () => {
    if (loading) return;

    const fileName = item.fileName || item.name || t('IsGenerated');

    setLoading(true);

    const document = await handleDownloadFile(item);

    setLoading(false);

    document && downloadBase64Attach({ fileName }, base64ToBlob(document));
  };

  const file = React.useMemo(() => getFile(), [getFile]);

  const fileName = React.useMemo(
    () => item.fileName || item.name || '',
    [item.fileName, item.name]
  );
  const extension = React.useMemo(() => fileName.split('.').pop().toLowerCase(), [fileName]);

  const error = React.useMemo(() => (file instanceof Error ? file : null), [file]);

  return (
    <>
      <IconButton onClick={() => setOpenModal(true)} aria-label="more">
        <MoreHorizIcon />
      </IconButton>
      <Modal open={openModal} onClose={() => setOpenModal(false)} className={classes.modal}>
        <div className={classes.paper}>
          <Grid container justifyContent="flex-end">
            <IconButton className={classes.closeIcon} onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Grid>
          <div className={classes.buttonContainer}>
            <Button
              variant="contained"
              className={classes.download}
              fullWidth
              sx={{
                '.&MuiGrid-item': {
                  paddingTop: 0
                }
              }}
              onClick={showPreviewDialog}
            >
              <VisibilityIconAlt className={classes.buttonIcon} />
              {t('Preview')}
            </Button>
            <Button
              variant="contained"
              className={classes.download}
              fullWidth
              onClick={handleDownload}
            >
              <SaveAltIcon className={classes.buttonIcon} />
              {t('SaveBtn')}
            </Button>
          </div>
        </div>
      </Modal>
      <FileViewerDialog
        darkTheme={darkTheme}
        file={file}
        fileName={fileName}
        open={!!(showPreview && file && !error)}
        extension={extension}
        onClose={() => setShowPreview(false)}
      />
    </>
  );
};

export default translate('TaskPage')(FileModal);
