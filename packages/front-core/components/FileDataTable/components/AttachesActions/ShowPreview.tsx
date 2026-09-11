import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';

import themeRaw from 'theme';
import FileViewerDialogRaw from 'components/FileViewerDialog';
import { ReactComponent as VisibilityIcon } from 'assets/img/visibility.svg';
import { ReactComponent as VisibilityIconAlt } from '../../assets/ic_visibility.svg';

const FileViewerDialog = FileViewerDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
// `theme` resolves per-app; see the CodeEditDialog batch notes in TYPESCRIPT.md.
const theme = themeRaw as unknown as { fileDataTableTypePremium?: boolean };

interface FileItem {
  id?: string;
  link?: string;
  downloadToken?: string;
  fileName?: string;
  name?: string;
  previewIcon?: React.ReactNode;
  [key: string]: unknown;
}

interface ShowPreviewProps {
  item: FileItem;
  itemId: string;
  fileStorage: Record<string, unknown>;
  handleDownloadFile: (item: FileItem) => Promise<string | undefined>;
  darkTheme?: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
  previewIcon?: React.ReactNode;
  GridActionsCellItem?: React.ComponentType<Record<string, unknown>> | null;
  withPrint?: boolean;
}

const ShowPreview = (props: ShowPreviewProps) => {
  const {
    item,
    itemId,
    fileStorage,
    handleDownloadFile,
    darkTheme = false,
    t,
    previewIcon = null,
    GridActionsCellItem,
    withPrint
  } = props;

  const [showPreview, setShowPreview] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const getFile = React.useMemo(() => {
    return () => {
      if (itemId) return fileStorage[itemId];
      return (
        (fileStorage || {})[(item.id || item.link) as string] ||
        (fileStorage || {})[item.downloadToken as string]
      );
    };
  }, [fileStorage, itemId, item.id, item.downloadToken]);

  const showPreviewDialog = React.useMemo(() => {
    return async () => {
      if (loading) return;

      if (getFile()) {
        setShowPreview(true);
        return;
      }

      setLoading(true);

      await handleDownloadFile(item);

      setLoading(false);

      setShowPreview(true);
    };
  }, [loading, getFile, handleDownloadFile, item]);

  const file = React.useMemo(() => getFile(), [getFile]);

  const fileName = React.useMemo(
    () => item.fileName || item.name || '',
    [item.fileName, item.name]
  );
  const extension = React.useMemo(() => (fileName.split('.').pop() || '').toLowerCase(), [fileName]);

  const icon = React.useMemo(() => {
    if (loading) return <CircularProgress size={24} />;
    if (previewIcon) return previewIcon;
    if (item.previewIcon) return item.previewIcon;
    return theme?.fileDataTableTypePremium ? <VisibilityIconAlt /> : <VisibilityIcon />;
  }, [loading, previewIcon, item.previewIcon]);

  const error = React.useMemo(() => (file instanceof Error ? file : null), [file]);

  return (
    <>
      <Tooltip title={t('ShowPreview')}>
        {GridActionsCellItem ? (
          <GridActionsCellItem
            icon={loading ? <CircularProgress size={24} /> : <VisibilityIconAlt />}
            label={t('ShowPreview')}
            aria-label={t('ShowPreview')}
            onClick={showPreviewDialog}
          />
        ) : (
          <IconButton onClick={showPreviewDialog} aria-label={t('ShowPreview')}>
            {icon}
          </IconButton>
        )}
      </Tooltip>

      <FileViewerDialog
        darkTheme={darkTheme}
        file={file}
        fileName={fileName}
        open={!!(showPreview && file && !error)}
        extension={extension}
        onClose={() => setShowPreview(false)}
        withPrint={withPrint}
      />
    </>
  );
};

export default translate('WorkflowPage')(ShowPreview as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
