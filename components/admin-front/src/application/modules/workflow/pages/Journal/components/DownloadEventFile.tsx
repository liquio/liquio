import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { useTranslate } from 'react-translate';
import GetAppIcon from '@mui/icons-material/GetApp';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { addError } from 'actions/error';
import { requestWorkflowProcessAttach } from 'actions/workflowProcess';
import downloadBase64Attach from 'helpers/downloadBase64Attach';

interface EventFileData {
  result?: {
    saveDocument?: { savedDocument?: { fileId?: string | number; fileName?: string } };
    sendToExternalService?: { sendingResult?: { savedDocument?: { fileId?: string | number; fileName?: string } } };
  };
}

interface DownloadEventFileProps {
  data?: EventFileData;
  actions: {
    addError: (error: unknown) => void;
    requestWorkflowProcessAttach: (id?: string | number, params?: { link?: string | number; id?: string | number }) => Promise<unknown>;
  };
  workflowId?: string | number;
}

const DownloadEventFile = ({ data, actions, workflowId }: DownloadEventFileProps) => {
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
      downloadBase64Attach({ fileName }, file as string);
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

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    addError: bindActionCreators(addError, dispatch),
    requestWorkflowProcessAttach: bindActionCreators(
      requestWorkflowProcessAttach,
      dispatch,
    ),
  },
});

export default connect(null, mapDispatch)(DownloadEventFile as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
