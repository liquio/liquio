import React from 'react';

import DataListRaw from 'components/DataList';
import ListTemplate from 'components/FileDataList/ListTemplate';

const DataList = DataListRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface FileDataListProps {
  onClick?: (...args: unknown[]) => void;
  onPreviewError?: (...args: unknown[]) => void;
  [key: string]: unknown;
}

const FileDataList = ({ onClick = () => null, onPreviewError, ...props }: FileDataListProps) => (
  <DataList
    {...props}
    ItemTemplate={(itemProps: Record<string, unknown>) => (
      <ListTemplate {...props} {...itemProps} onClick={onClick} onPreviewError={onPreviewError} />
    )}
  />
);

export default FileDataList;
