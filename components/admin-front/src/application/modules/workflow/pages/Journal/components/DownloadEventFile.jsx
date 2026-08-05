import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useTranslate } from 'react-translate';
import GetAppIcon from '@mui/icons-material/GetApp';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { addError } from 'actions/error';
import { requestWorkflowProcessAttach } from 'actions/workflowProcess';
import downloadBase64Attach from 'helpers/downloadBase64Attach';

const DownloadEventFile = ({ data, actions, workflowId }) => {
  const [loading, setLoading] = React.useState(false);
  const t = useTranslate('ProcessesListPage');

  if (!data) return null;

  const file =
    data?.result?.saveDocument?.savedDocument ||
    data?.result?.sendToExternalService?.sendingResult?.savedDocument;

  if (!file) return null;

  const fileId = file.fileId;
  const fileName = file.fileName;

  if (!fileId) return null;

  const downloadFile = async () => {
    try {
      setLoading(true);
      const file = await actions.requestWorkflowProcessAttach(workflowId, {
        link: fileId,
        id: fileId,
      });
      downloadBase64Attach({ fileName }, file);
      setLoading(false);
    } catch (e) {
      actions.addError(e);
    }
  };

  return (
    <Tooltip title={t('Download')}>
      <IconButton onClick={downloadFile} disabled={loading} size="large">
        {loading ? (
          <CircularProgress size={16} />
        ) : (
          <GetAppIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
};

const mapDispatch = (dispatch) => ({
  actions: {
    addError: bindActionCreators(addError, dispatch),
    requestWorkflowProcessAttach: bindActionCreators(
      requestWorkflowProcessAttach,
      dispatch,
    ),
  },
});

export default connect(null, mapDispatch)(DownloadEventFile);
