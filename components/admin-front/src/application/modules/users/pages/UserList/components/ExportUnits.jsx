import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';

import { Tooltip, IconButton } from '@mui/material';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

class ExportUnits extends React.Component {
  exportUnits = async () => {
    const {
      rowsSelected,
      actions: { exportUnits },
    } = this.props;
    const blob = await exportUnits(rowsSelected);
    return downloadBase64Attach({ fileName: 'units.bpmn' }, blob);
  };

  render() {
    const { t } = this.props;
    return (
      <>
        <Tooltip title={t('ExportUnits')}>
          <IconButton onClick={this.exportUnits} id="export-units" size="large">
            <CloudDownloadIcon />
          </IconButton>
        </Tooltip>
      </>
    );
  }
}

ExportUnits.propTypes = {
  actions: PropTypes.object.isRequired,
  rowsSelected: PropTypes.array,
};

ExportUnits.defaultProps = {
  rowsSelected: [],
};

export default translate('UnitsListPage')(ExportUnits);
