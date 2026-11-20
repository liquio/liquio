import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { bindActionCreators, Dispatch } from 'redux';
import FileViewerDialogRaw from 'components/FileViewerDialog';
import { requestWorkflowProcessAttach } from 'application/actions/workflowProcess';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

import VisibilityIcon from '@mui/icons-material/Visibility';

const FileViewerDialog = FileViewerDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DocumentInfo {
  id?: string | number;
  document: { fileId?: string | number; fileName?: string; fileType?: string };
}

interface DocumentPreviewProps {
  t: (key: string) => string;
  details: DocumentInfo;
  actions: {
    requestWorkflowProcessAttach: (id?: string | number, params?: { link?: string | number; id?: string | number }) => Promise<unknown>;
    addMessage: (message: unknown) => void;
  };
  onClose: () => void;
}

const DocumentPreview = ({ t, details, actions, onClose }: DocumentPreviewProps) => {
  const [file, setFile] = React.useState<string | null>(null);
  const { fileId, fileName, fileType } = details.document;

  const normalizePdfPayload = React.useCallback((payload: unknown) => {
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

    setFile(normalizePdfPayload(result) as string);
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

interface WorkflowProcessState {
  workflowProcess: { attaches: Record<string, unknown> };
}

const mapState = ({ workflowProcess: { attaches } }: WorkflowProcessState) => ({ attaches });

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    requestWorkflowProcessAttach: bindActionCreators(
      requestWorkflowProcessAttach,
      dispatch,
    ),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('ProcessesListPage')(DocumentPreview as never);
export default connect(mapState, mapDispatch)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
