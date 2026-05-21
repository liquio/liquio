import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useTranslate } from 'react-translate';

import GetAppIcon from '@mui/icons-material/GetApp';

import {
  CircularProgress,
  ListItemIcon,
  MenuItem,
  Typography,
} from '@mui/material';

import { addMessage } from 'actions/error';
import {
  requestWorkflowProcessAttach,
  requestWorkflowProcessAttachP7S,
} from 'actions/workflowProcess';

import downloadBase64Attach from 'helpers/downloadBase64Attach';
import Message from 'components/Snackbars/Message';

const DocumentDownloadP7S = ({ details, actions, onClose }) => {
  const [loading, setLoading] = React.useState(false);
  const [loadingP7S, setLoadingP7S] = React.useState(false);
  const t = useTranslate('ProcessesListPage');
  const { fileId, fileName } = details.document;
  const isP7S =
    details?.document?.signatures && details?.document?.signatures?.length > 0;

  const showDownloadError = React.useCallback(
    (error) => {
      const details = error?.response?.details || error?.details;

      actions.addMessage(
        new Message('FailGettingDocument', 'error', details),
      );
    },
    [actions],
  );

  const getFileP7S = React.useCallback(async () => {
    try {
      setLoadingP7S(true);
      const p7sFile = await actions.requestWorkflowProcessAttachP7S(
        details.id,
        { link: fileId, id: fileId },
      );
      downloadBase64Attach({ fileName: fileName + '.p7s' }, p7sFile);
      setLoadingP7S(false);
      onClose();
    } catch (e) {
      setLoadingP7S(false);
      onClose();
      showDownloadError(e);
    }
  }, [details.id, fileId, fileName, onClose, showDownloadError]);

  const getFile = React.useCallback(async () => {
    try {
      setLoading(true);
      const file = await actions.requestWorkflowProcessAttach(details.id, {
        link: fileId,
        id: fileId,
      });
      downloadBase64Attach({ fileName }, file);
      setLoading(false);
      onClose();
    } catch (e) {
      showDownloadError(e);
    }
  }, [details.id, fileId, fileName, onClose, showDownloadError]);

  return (
    <>
      <MenuItem onClick={getFile} disabled={loading}>
        <ListItemIcon>
          {loading ? (
            <CircularProgress size={16} />
          ) : (
            <GetAppIcon fontSize="small" />
          )}
        </ListItemIcon>
        <Typography variant="inherit">{t('Download')}</Typography>
      </MenuItem>
      {isP7S && (
        <MenuItem onClick={getFileP7S} disabled={loadingP7S}>
          <ListItemIcon>
            {loadingP7S ? (
              <CircularProgress size={16} />
            ) : (
              <GetAppIcon fontSize="small" />
            )}
          </ListItemIcon>
          <Typography variant="inherit">{t('DownloadP7S')}</Typography>
        </MenuItem>
      )}
    </>
  );
};

const mapDispatch = (dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch),
    requestWorkflowProcessAttach: bindActionCreators(
      requestWorkflowProcessAttach,
      dispatch,
    ),
    requestWorkflowProcessAttachP7S: bindActionCreators(
      requestWorkflowProcessAttachP7S,
      dispatch,
    ),
  },
});

export default connect(null, mapDispatch)(DocumentDownloadP7S);
