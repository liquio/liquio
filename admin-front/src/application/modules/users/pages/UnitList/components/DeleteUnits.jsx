import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';

import { Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialog from 'components/ConfirmDialog';

const ROWS_PER_PAGE = 10;

class DeleteUnits extends React.Component {
  state = { showDialog: false };

  deleteUnits = async () => {
    const {
      rowsSelected,
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

DeleteUnits.propTypes = {
  unitActions: PropTypes.object.isRequired,
  rowsSelected: PropTypes.array.isRequired,
  actions: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
};

DeleteUnits.defaultProps = {
  isAdmin: false,
};

export default translate('UnitsListPage')(DeleteUnits);
