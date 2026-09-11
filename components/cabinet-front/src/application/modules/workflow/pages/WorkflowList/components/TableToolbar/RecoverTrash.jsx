import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';

import ConfirmDialog from 'components/ConfirmDialog';
import { ReactComponent as RestoreFromTrash } from 'assets/img/ic_restore_from_trash.svg';

class RestoreTrash extends React.Component {
  state = { openConfirmDialog: false };

  handleOpenConfirmDialog = () => this.setState({ openConfirmDialog: true });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  handleRecover = async () => {
    const {
      data,
      rowsSelected,
      actions: { onRowsRecover }
    } = this.props;
    onRowsRecover &&
      (await onRowsRecover(
        rowsSelected.map((row) => data.find(({ id }) => id === row).entryTaskId)
      ));
    this.handleCloseConfirmDialog();
  };

  render() {
    const { t } = this.props;
    const { openConfirmDialog } = this.state;
    return (
      <>
        <Button onClick={this.handleOpenConfirmDialog} startIcon={<RestoreFromTrash />}>
          {t('RestoreTrash')}
        </Button>
        <ConfirmDialog
          fullScreen={false}
          open={openConfirmDialog}
          title={t('RestoreTrashConfirmation')}
          description={t('RestoreTrashConfirmationText')}
          handleClose={this.handleCloseConfirmDialog}
          handleConfirm={this.handleRecover}
        />
      </>
    );
  }
}

RestoreTrash.propTypes = {
  rowsSelected: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired
};

export default translate('TrashListPage')(RestoreTrash);
