import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import FileDataTable from 'components/FileDataTable';
import { Dialog, IconButton, Tooltip } from '@mui/material';

import AttachmentIcon from '@mui/icons-material/Attachment';
import { bindActionCreators } from 'redux';

import { requestWorkflowProcessAttach } from 'application/actions/workflowProcess';

const AttachmentList = ({ t, details, actions, attaches }) => {
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
            handleDownloadFile: (file) =>
              actions.requestWorkflowProcessAttach(details.id, file),
          }}
        />
      </Dialog>
    </>
  );
};

const mapState = ({ workflowProcess: { attaches } }) => ({ attaches });

const mapDispatch = (dispatch) => ({
  actions: {
    requestWorkflowProcessAttach: bindActionCreators(
      requestWorkflowProcessAttach,
      dispatch,
    ),
  },
});

const translated = translate('ProcessesListPage')(AttachmentList);
export default connect(mapState, mapDispatch)(translated);
