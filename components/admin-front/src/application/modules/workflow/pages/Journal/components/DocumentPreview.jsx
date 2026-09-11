import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import FileViewerDialog from 'components/FileViewerDialog';
import { requestWorkflowProcessAttach } from 'application/actions/workflowProcess';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

import VisibilityIcon from '@mui/icons-material/Visibility';

const DocumentPreview = ({ t, details, actions, onClose }) => {
  const [file, setFile] = React.useState(null);
  const { fileId, fileName, fileType } = details.document;

  const normalizePdfPayload = React.useCallback((payload) => {
    if (typeof payload !== 'string') {
      return payload;
    }

    if (!payload) {
      return payload;
    }

    // Backend can return octet-stream data URLs or raw base64 for PDFs.
    if (payload.startsWith('data:application/octet-stream;base64,')) {
      return payload.replace(
        'data:application/octet-stream;base64,',
        'data:application/pdf;base64,',
      );
    }

    if (payload.startsWith('data:application/pdf;base64,')) {
      return payload;
    }

    if (payload.startsWith('data:') && payload.includes(';base64,')) {
      return payload.replace(/^data:[^;]+;base64,/, 'data:application/pdf;base64,');
    }

    if (!payload.startsWith('data:')) {
      return `data:application/pdf;base64,${payload}`;
    }

    return payload;
  }, []);

  const getFile = async () => {
    onClose();
    const result = await actions.requestWorkflowProcessAttach(details.id, {
      link: fileId,
      id: fileId,
    });

    if (result instanceof Error) {
      actions.addMessage(new Message('FailGettingDocument', 'error'));
      return;
    }

    setFile(normalizePdfPayload(result));
  };

  const getExtension = () =>
    (fileType || '').split('/')[(fileType || '').split('/').length - 1] || '';

  return (
    <>
      <MenuItem onClick={getFile}>
        <ListItemIcon>
          <VisibilityIcon fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{t('Preview')}</Typography>
      </MenuItem>
      <FileViewerDialog
        darkTheme={true}
        file={file}
        fileName={fileName}
        open={!!file}
        extension={getExtension()}
        onClose={() => setFile(null)}
      />
    </>
  );
};

DocumentPreview.propTypes = {
  details: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
};

const mapState = ({ workflowProcess: { attaches } }) => ({ attaches });

const mapDispatch = (dispatch) => ({
  actions: {
    requestWorkflowProcessAttach: bindActionCreators(
      requestWorkflowProcessAttach,
      dispatch,
    ),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('ProcessesListPage')(DocumentPreview);
export default connect(mapState, mapDispatch)(translated);
