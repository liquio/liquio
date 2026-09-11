import { IconButton } from '@mui/material';
import { PrintOutlined } from '@mui/icons-material';
import React, { useCallback } from 'react';
import saveAs from 'file-saver';
import base64ToBlob from 'helpers/base64ToBlob';

const PrintReportButton = ({
  report: { name, id: reportId, report: { pdfTemplate } = {} } = {},
  loadReport,
}) => {
  const handlePrint = useCallback(async () => {
    const pdfDocument = await loadReport(reportId, 'pdf');
    saveAs(base64ToBlob(pdfDocument, 'application/pdf'), `${name}.pdf`);
  }, [loadReport, name, reportId]);

  if (!pdfTemplate) {
    return null;
  }

  return (
    <IconButton onClick={handlePrint} size="large">
      <PrintOutlined />
    </IconButton>
  );
};

export default PrintReportButton;
