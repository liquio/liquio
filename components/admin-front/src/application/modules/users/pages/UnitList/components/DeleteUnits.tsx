import React from 'react';
import { translate } from 'react-translate';

import { Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const ROWS_PER_PAGE = 10;

interface DeleteUnitsProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  rowsSelected?: string[];
  actions: { onChangeRowsPerPage: (rowsPerPage: number, force?: boolean) => void };
  unitActions: { onRowsDelete: (rowsSelected: string[]) => Promise<unknown> };
}

class DeleteUnits extends React.Component<DeleteUnitsProps, { showDialog: boolean }> {
  state = { showDialog: false };

  deleteUnits = async () => {
    const {
      rowsSelected = [],
      actions,
      unitActions: { onRowsDelete },
    } = this.props;
    this.setState({ showDialog: false });
    await onRowsDelete(rowsSelected);
    actions.onChangeRowsPerPage(ROWS_PER_PAGE, true);
  };

  render() {
    const { t } = this.props;
    const { showDialog } = this.state;
    const isAdmin = window.location.pathname === '/users/systemUnits';

    return (
      <>
        <Tooltip title={isAdmin ? t('DeleteSystemUnit') : t('DeleteUnits')}>
          <span>
            <IconButton
              onClick={() => this.setState({ showDialog: true })}
              id="export-units"
              size="large"
              disabled={isAdmin}
            >
              <DeleteIcon />
            </IconButton>
          </span>
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
