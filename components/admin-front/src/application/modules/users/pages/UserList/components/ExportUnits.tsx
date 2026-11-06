import React from 'react';
import { translate } from 'react-translate';

import { Tooltip, IconButton } from '@mui/material';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

interface ExportUnitsProps {
  t: (key: string) => string;
  actions: { exportUnits: (rowsSelected: string[]) => Promise<string | undefined> };
  rowsSelected?: string[];
}

class ExportUnits extends React.Component<ExportUnitsProps> {
  exportUnits = async () => {
    const {
      rowsSelected = [],
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

export default translate('UnitsListPage')(ExportUnits as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
