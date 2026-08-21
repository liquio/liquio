import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';

import { Tooltip, IconButton } from '@mui/material';

import DeleteIcon from '@mui/icons-material/DeleteOutline';

import ConfirmDialog from 'components/ConfirmDialog';

class DeleteUnits extends React.Component {
  state = { showDialog: false };

  deleteUnits = async () => {
    const {
      rowsSelected,
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

DeleteUnits.propTypes = {
  actions: PropTypes.object.isRequired,
  rowsSelected: PropTypes.array,
};

DeleteUnits.defaultProps = {
  rowsSelected: [],
};

export default translate('UnitsListPage')(DeleteUnits);
