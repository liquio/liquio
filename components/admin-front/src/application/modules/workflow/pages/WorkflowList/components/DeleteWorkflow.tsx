import React from 'react';
import { translate } from 'react-translate';

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

import ConfirmDialogRaw from 'components/ConfirmDialog';

import DeleteIcon from 'assets/img/delete_icon.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DeleteWorkflowProps {
  t: (key: string) => string;
  actions: { deleteWorkflow: (id: string | number) => Promise<unknown>; load: () => void };
  workflow: { id: string | number };
  handleClose?: () => void;
}

interface DeleteWorkflowState {
  showDialog: boolean;
  showErrorDialog: boolean;
  error: Error | null;
}

class DeleteWorkflow extends React.Component<DeleteWorkflowProps, DeleteWorkflowState> {
  state: DeleteWorkflowState = { showDialog: false, showErrorDialog: false, error: null };

  deleteWorkflow = async () => {
    const { actions, workflow } = this.props;
    const result = await actions.deleteWorkflow(workflow.id);
    this.setState({ showDialog: false });
    if (result instanceof Error) {
      this.setState({ showErrorDialog: true, error: result });
      return;
    }
    actions.load();
  };

  render() {
    const { t, handleClose } = this.props;
    const { showDialog, showErrorDialog, error } = this.state;

    return (
      <>
        <MenuItem
          onClick={() => this.setState({ showDialog: true }, handleClose)}
        >
          <ListItemIcon>
            <img src={DeleteIcon} alt="delete icon" width={20} />
          </ListItemIcon>
          <ListItemText primary={t('DeleteWorkflow')} />
        </MenuItem>

        <ConfirmDialog
          open={showDialog}
          darkTheme={true}
          handleClose={() => this.setState({ showDialog: false })}
          handleConfirm={this.deleteWorkflow}
          title={t('DeleteWorkflowDialogTitle')}
          description={t('DeleteWorkflowDialogDescription')}
        />
        {showErrorDialog ? (
          <Dialog
            open={true}
            onClose={() => this.setState({ showErrorDialog: false })}
          >
            <DialogTitle>{t('ErrorWhileDeletingWorkflow')}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {error
                  ? t(`${error.message}_deleting`)
                  : t('WorkflowDeletingErrorMessage')}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => this.setState({ showErrorDialog: false })}
                color="primary"
                autoFocus={true}
              >
                {t('CloseErrorDialog')}
              </Button>
            </DialogActions>
          </Dialog>
        ) : null}
      </>
    );
  }
}

export default translate('WorkflowListAdminPage')(DeleteWorkflow as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
