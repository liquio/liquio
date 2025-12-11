import React from 'react';
import objectPath from 'object-path';
import moment from 'moment';
import { GridActionsCellItem } from '@mui/x-data-grid';

import evaluate from 'helpers/evaluate';
import HighlightText from 'components/HighlightText';
import DirectPreview from 'components/FileDataTable/components/DirectPreview';

const renderTableCell = ({ row: rowOrigin, column, selectedKey, search, isHistory }) => {
  let text;

  const row = isHistory ? rowOrigin.data : rowOrigin;

  if (typeof selectedKey.schema.toTable === 'object') {
    text = evaluate(selectedKey.schema.toTable[column.headerName], row);
  } else {
    text = objectPath.get(row, column.field);
  }

  if (text instanceof Error) {
    text = evaluate(selectedKey.schema.toTable[column.propertyName], row);
  }

  if (column?.control === 'file') {
    const filesItems = [];

    [].concat(text).forEach((file) => {
      if (file?.url) {
        filesItems.push(
          <DirectPreview
            key={file?.url}
            url={file?.url}
            GridActionsCellItem={GridActionsCellItem}
          />
        );
      }
    });

    return filesItems;
  }

  const columnType = selectedKey.schema?.properties[column?.propertyName]?.type;

  let displayText = typeof text === 'object' ? JSON.stringify(text) : text;

  displayText = columnType === 'boolean' ? JSON.stringify(!!displayText) : displayText;

  if (column?.dateFormat) {
    displayText = moment(displayText).format(column?.dateFormat);
  }

  return <HighlightText highlight={search} text={displayText} />;
};

export default renderTableCell;
