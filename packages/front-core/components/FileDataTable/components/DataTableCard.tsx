import React from 'react';
import { ImageListItem, Card, Checkbox, Toolbar } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';

import SignatureDetailsRaw from 'components/FileDataTable/components/SignatureDetails';
import AttachesActionsRaw from './AttachesActions';
import FileNameColumnRaw from './FileNameColumn';
import FilePreviewRaw from './FilePreview';

const SignatureDetails = SignatureDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const AttachesActions = AttachesActionsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FileNameColumn = FileNameColumnRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FilePreview = FilePreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  card: {
    marginRight: 10,
    marginBottom: 10,
    padding: '4px 4px 0',
    width: 199,
    border: 'rgba(0,0,0,0.2) 1px solid',
    background: '#eee'
  },
  toolbar: {
    position: 'inherit' as const,
    padding: 0,
    minHeight: 0
  },
  selected: {
    background: '#feffda'
  },
  grow: {
    flexGrow: 1
  }
};

interface FileItem {
  fileName?: string;
  name?: string;
  signature?: unknown;
  meta?: { description?: string };
  [key: string]: unknown;
}

interface DataTableCardProps {
  classes: Record<string, string>;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  checkable?: boolean;
  actions?: Record<string, unknown>;
  fileStorage?: Record<string, unknown>;
  item: FileItem;
}

const DataTableCard = ({
  classes,
  selected = false,
  selectable = false,
  onSelect,
  checkable = false,
  actions,
  fileStorage,
  item
}: DataTableCardProps) => {
  const fileName = item.fileName || item.name || '';
  const meta = item?.meta?.description || null;

  return (
    <ImageListItem cols={2}>
      <Card elevation={0} className={classNames(classes.card, { [classes.selected]: selected })}>
        {checkable ? (
          <Toolbar className={classes.toolbar}>
            <Checkbox checked={selected} disabled={!selectable} onChange={onSelect} />
            <div className={classes.grow} />
            {item.signature ? <SignatureDetails item={item} /> : null}
            {item instanceof File ? null : (
              <AttachesActions item={item} actions={actions} fileStorage={fileStorage} />
            )}
          </Toolbar>
        ) : null}
        <FilePreview file={item} />
        <FileNameColumn
          name={fileName}
          item={item}
          iconSize={16}
          meta={meta}
          extension={fileName.split('.').pop()}
          whiteSpace={true}
        />
      </Card>
    </ImageListItem>
  );
};

export default withStyles(styles)(DataTableCard as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
