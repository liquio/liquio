import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import FileDataTableRaw from 'components/FileDataTable';
import { Dialog, IconButton, Tooltip } from '@mui/material';

import AttachmentIcon from '@mui/icons-material/Attachment';
import { bindActionCreators, Dispatch } from 'redux';

import { requestWorkflowProcessAttach } from 'application/actions/workflowProcess';

const FileDataTable = FileDataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface Attachment {
  id?: string | number;
  [key: string]: unknown;
}

interface LogDetail {
  id?: string | number;
  document?: { attachments?: Attachment[] };
}

interface AttachmentListProps {
  t: (key: string) => string;
  details: LogDetail;
  actions: { requestWorkflowProcessAttach: (id?: string | number, file?: Attachment) => Promise<unknown> };
  attaches: Record<string, unknown>;
}

const AttachmentList = ({ t, details, actions, attaches }: AttachmentListProps) => {
  const [open, setOpen] = React.useState(false);

  if (!details.document) {
    return null;
  }

  const { attachments } = details.document;

  if (!attachments || !attachments.length) {
    return null;
  }

  return (
    <>
      <Tooltip title={t('AttachmentList')}>
        <IconButton onClick={() => setOpen(true)} size="large">
          <AttachmentIcon />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="sm"
        onClose={() => setOpen(false)}
      >
        <FileDataTable
          data={attachments}
          fileStorage={attaches}
          admin={true}
          controls={{
            pagination: false,
            toolbar: true,
            search: false,
            header: true,
            refresh: false,
            switchView: false,
            customizateColumns: false,
          }}
          darkTheme={true}
          actions={{
            handleDownloadFile: (file: Attachment) =>
              actions.requestWorkflowProcessAttach(details.id, file),
          }}
        />
      </Dialog>
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
  },
});

const translated = translate('ProcessesListPage')(AttachmentList as never);
export default connect(mapState, mapDispatch)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
