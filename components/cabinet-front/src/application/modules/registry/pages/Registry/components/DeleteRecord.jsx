import React, { Fragment } from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import DeletedIcon from '@mui/icons-material/Delete';

import ConfirmDialog from 'components/ConfirmDialog';

class DeleteRecord extends React.Component {
  state = { openConfirmDialog: false };

  handleOpenConfirmDialog = () => this.setState({ openConfirmDialog: true });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  handleDelete = async () => {
    const { rowsSelected, actions } = this.props;
    actions.onRowsDelete && (await actions.onRowsDelete([rowsSelected.id]));
    this.handleCloseConfirmDialog();
  };

  render() {
    const { t } = this.props;
    const { openConfirmDialog } = this.state;
    return (
      <Fragment>
        <Tooltip title={t('Delete')}>
          <IconButton onClick={this.handleOpenConfirmDialog} id="delete-record" size="large">
            <DeletedIcon />
          </IconButton>
        </Tooltip>
        <ConfirmDialog
          fullScreen={false}
          open={openConfirmDialog}
          title={t('DeleteRecordConfirmation')}
          description={t('DeleteRecordConfirmationText')}
          handleClose={this.handleCloseConfirmDialog}
          handleConfirm={this.handleDelete}
        />
      </Fragment>
    );
  }
}

export default translate('RegistryPage')(DeleteRecord);
