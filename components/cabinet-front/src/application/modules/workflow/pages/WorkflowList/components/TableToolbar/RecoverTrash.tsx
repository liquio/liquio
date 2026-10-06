import React from 'react';
import { translate } from 'react-translate';
import { Button } from '@mui/material';

import ConfirmDialogRaw from 'components/ConfirmDialog';
import { ReactComponent as RestoreFromTrash } from 'assets/img/ic_restore_from_trash.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface WorkflowRow {
  id: string | number;
  entryTaskId?: string | number;
  [key: string]: unknown;
}

interface RecoverTrashProps {
  rowsSelected: Array<string | number>;
  data: WorkflowRow[];
  t: (key: string) => string;
  actions: { onRowsRecover?: (ids: Array<string | number | undefined>) => Promise<unknown> };
}

interface RecoverTrashState {
  openConfirmDialog: boolean;
}

class RestoreTrash extends React.Component<RecoverTrashProps, RecoverTrashState> {
  state: RecoverTrashState = { openConfirmDialog: false };

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
        rowsSelected.map((row) => (data.find(({ id }) => id === row) as WorkflowRow).entryTaskId)
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

export default translate('TrashListPage')(RestoreTrash as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
