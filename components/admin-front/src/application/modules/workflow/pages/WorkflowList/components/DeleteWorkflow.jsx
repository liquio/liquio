import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';

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

import ConfirmDialog from 'components/ConfirmDialog';

import DeleteIcon from 'assets/img/delete_icon.svg';

class DeleteWorkflow extends React.Component {
  state = { showDialog: false, showErrorDialog: false, error: null };

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

DeleteWorkflow.propTypes = {
  actions: PropTypes.object.isRequired,
};

DeleteWorkflow.defaultProps = {};

export default translate('WorkflowListAdminPage')(DeleteWorkflow);
