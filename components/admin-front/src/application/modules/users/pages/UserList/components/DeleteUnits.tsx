import React from 'react';
import { translate } from 'react-translate';

import { Tooltip, IconButton } from '@mui/material';

import DeleteIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DeleteUnitsProps {
  t: (key: string) => string;
  actions: { onRowsDelete: (rowsSelected: string[]) => Promise<unknown> };
  rowsSelected?: string[];
}

class DeleteUnits extends React.Component<DeleteUnitsProps, { showDialog: boolean }> {
  state = { showDialog: false };

  deleteUnits = async () => {
    const {
      rowsSelected = [],
      actions: { onRowsDelete },
    } = this.props;
    await onRowsDelete(rowsSelected);
  };

  render() {
    const { t } = this.props;
    const { showDialog } = this.state;
    return (
      <>
        <Tooltip title={t('DeleteUnits')}>
          <IconButton
            onClick={() => this.setState({ showDialog: true })}
            id="export-units"
            size="large"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <ConfirmDialog
          open={showDialog}
          darkTheme={true}
          handleClose={() => this.setState({ showDialog: false })}
          handleConfirm={this.deleteUnits}
          title={t('DeleteUnitsDialogTitle')}
          description={t('DeleteUnitsDialogDescription')}
        />
      </>
    );
  }
}

export default translate('UnitsListPage')(DeleteUnits as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
