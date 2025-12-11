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

import { addError } from 'actions/error';
import {
  requestWorkflowProcessAttach,
  requestWorkflowProcessAttachP7S,
} from 'actions/workflowProcess';

import downloadBase64Attach from 'helpers/downloadBase64Attach';

const DocumentDownloadP7S = ({ details, actions, onClose }) => {
  const [loading, setLoading] = React.useState(false);
  const [loadingP7S, setLoadingP7S] = React.useState(false);
  const t = useTranslate('ProcessesListPage');
  const { fileId, fileName } = details.document;
  const isP7S =
    details?.document?.signatures && details?.document?.signatures?.length > 0;

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
      try {
        const error = new Error(e.response?.details[0].message);
        actions.addError(error);
      } catch {
        actions.addError(e);
      }
    }
  }, [actions, details.id, fileId, fileName, onClose]);

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
      actions.addError(e);
    }
  }, [actions, details.id, fileId, fileName, onClose]);

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
    addError: bindActionCreators(addError, dispatch),
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
