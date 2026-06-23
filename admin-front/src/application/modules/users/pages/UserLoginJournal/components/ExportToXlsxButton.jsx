import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import * as XLSX from 'xlsx';
import {
  Tooltip,
  IconButton,
  Dialog,
  DialogContent,
  LinearProgress,
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';

import { getVisibleColumns, getCellValue, loadAllRows } from './exportData';

const ExportToXlsxButton = ({ t, actions, count, columns, hiddenColumns }) => {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    if (loading || !count) {
      return;
    }

    setLoading(true);
    try {
      const rows = await loadAllRows(actions);
      const visibleColumns = getVisibleColumns(columns, hiddenColumns);

      const wsData = [
        visibleColumns.map(({ name }) => name),
        ...rows.map((row) => visibleColumns.map(({ id }) => getCellValue(id, row))),
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Login history');
      XLSX.writeFile(wb, 'login-history.xlsx');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={t('ExportToXlsx')}>
        <div>
          <IconButton onClick={handleExport} disabled={loading || !count} size="large">
            <GridOnIcon />
          </IconButton>
        </div>
      </Tooltip>

      <Dialog open={loading} fullWidth={true} maxWidth="sm">
        <DialogContent>
          <LinearProgress />
        </DialogContent>
      </Dialog>
    </>
  );
};

ExportToXlsxButton.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  count: PropTypes.number,
  columns: PropTypes.array,
  hiddenColumns: PropTypes.array,
};

ExportToXlsxButton.defaultProps = {
  count: 0,
  columns: [],
  hiddenColumns: [],
};

export default translate('UserLoginJournal')(ExportToXlsxButton);
