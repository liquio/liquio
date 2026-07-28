import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';

import theme from 'theme';
import FileViewerDialog from 'components/FileViewerDialog';
import { ReactComponent as VisibilityIcon } from 'assets/img/visibility.svg';
import { ReactComponent as VisibilityIconAlt } from '../../assets/ic_visibility.svg';

const ShowPreview = (props) => {
  const {
    item,
    itemId,
    fileStorage,
    handleDownloadFile,
    darkTheme,
    t,
    previewIcon,
    GridActionsCellItem,
    withPrint
  } = props;

  const [showPreview, setShowPreview] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const getFile = React.useMemo(() => {
    return () => {
      if (itemId) return fileStorage[itemId];
      return (fileStorage || {})[item.id || item.link] || (fileStorage || {})[item.downloadToken];
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
  const extension = React.useMemo(() => fileName.split('.').pop().toLowerCase(), [fileName]);

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

ShowPreview.propTypes = {
  t: PropTypes.func.isRequired,
  handleDownloadFile: PropTypes.func.isRequired,
  item: PropTypes.object.isRequired,
  itemId: PropTypes.string.isRequired,
  fileStorage: PropTypes.object.isRequired,
  darkTheme: PropTypes.bool,
  previewIcon: PropTypes.node
};

ShowPreview.defaultProps = {
  darkTheme: false,
  previewIcon: null
};

export default translate('WorkflowPage')(ShowPreview);
