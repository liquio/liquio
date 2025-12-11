import React from 'react';
import Handlebars from 'handlebars';
import { print } from 'html-to-printer';
import { translate } from 'react-translate';

import { IconButton, Tooltip } from '@mui/material';

import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const ExportToPdfButton = ({ t, value, htmlTemplate }) => {
  if (!htmlTemplate || !value || !value.length) {
    return null;
  }

  const generateReport = () => {
    const html = Handlebars.compile(htmlTemplate)({ rows: value });

    print(html);
  };

  return (
    <Tooltip title={t('ExportDataToPdf')}>
      <IconButton onClick={generateReport} aria-label={t('ExportDataToPdf')}>
        <PictureAsPdfIcon />
      </IconButton>
    </Tooltip>
  );
};

export default translate('Elements')(ExportToPdfButton);
