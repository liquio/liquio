import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { print } from 'html-to-printer';
import {
  Tooltip,
  IconButton,
  Dialog,
  DialogContent,
  LinearProgress,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import { getVisibleColumns, getCellValue, escapeHtml, loadAllRows } from './exportData';

const ExportToPdfButton = ({ t, actions, count, columns, hiddenColumns }) => {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    if (loading || !count) {
      return;
    }

    setLoading(true);
    try {
      const rows = await loadAllRows(actions);
      const visibleColumns = getVisibleColumns(columns, hiddenColumns);

      const headers = visibleColumns
        .map(({ name }) => `<th>${escapeHtml(name)}</th>`)
        .join('');

      const body = rows
        .map(
          (row) =>
            `<tr>${visibleColumns
              .map(({ id }) => `<td>${escapeHtml(getCellValue(id, row))}</td>`)
              .join('')}</tr>`,
        )
        .join('');

      const html = `
        <style>
          #print-area table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
          #print-area th, #print-area td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; color: #000; background: #fff; }
          #print-area th { background: #f0f0f0; }
        </style>
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      `;

      print(html);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={t('ExportToPdf')}>
        <div>
          <IconButton onClick={handleExport} disabled={loading || !count} size="large">
            <PictureAsPdfIcon />
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

ExportToPdfButton.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  count: PropTypes.number,
  columns: PropTypes.array,
  hiddenColumns: PropTypes.array,
};

ExportToPdfButton.defaultProps = {
  count: 0,
  columns: [],
  hiddenColumns: [],
};

export default translate('UserLoginJournal')(ExportToPdfButton);
