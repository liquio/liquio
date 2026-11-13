import React from 'react';
import objectPath from 'object-path';
import moment from 'moment';
import { GridActionsCellItem } from '@mui/x-data-grid';

import evaluate from 'helpers/evaluate';
import HighlightTextRaw from 'components/HighlightText';
import DirectPreviewRaw from 'components/FileDataTable/components/DirectPreview';

const HighlightText = HighlightTextRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DirectPreview = DirectPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface SchemaProperty {
  type?: string;
}

interface SelectedKey {
  schema: {
    toTable?: Record<string, unknown>;
    properties?: Record<string, SchemaProperty>;
  };
}

interface Column {
  field?: string;
  headerName?: string;
  propertyName?: string;
  control?: string;
  dateFormat?: string;
}

interface RenderTableCellParams {
  row: Record<string, unknown>;
  column: Column;
  selectedKey: SelectedKey;
  search?: string;
  isHistory?: boolean;
}

const renderTableCell = ({ row: rowOrigin, column, selectedKey, search, isHistory }: RenderTableCellParams) => {
  let text: unknown;

  const row = isHistory ? (rowOrigin.data as Record<string, unknown>) : rowOrigin;

  if (typeof selectedKey.schema.toTable === 'object') {
    text = evaluate((selectedKey.schema.toTable as Record<string, unknown>)[column.headerName as string] as never, row);
  } else {
    text = objectPath.get(row, column.field as string);
  }

  if (text instanceof Error) {
    text = evaluate((selectedKey.schema.toTable as Record<string, unknown>)[column.propertyName as string] as never, row);
  }

  if (column?.control === 'file') {
    const filesItems: React.ReactNode[] = [];

    ([] as { url?: string }[]).concat(text as never).forEach((file) => {
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

  const columnType = selectedKey.schema?.properties?.[column?.propertyName as string]?.type;

  let displayText: unknown = typeof text === 'object' ? JSON.stringify(text) : text;

  displayText = columnType === 'boolean' ? JSON.stringify(!!displayText) : displayText;

  if (column?.dateFormat) {
    displayText = moment(displayText as string).format(column?.dateFormat);
  }

  return <HighlightText highlight={search} text={displayText} />;
};

export default renderTableCell;
