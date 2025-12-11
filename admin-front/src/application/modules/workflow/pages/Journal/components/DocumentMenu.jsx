import React from 'react';
import { translate } from 'react-translate';

import { Fade, IconButton, Menu, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import DocumentPreview from '../components/DocumentPreview';
import DocumentDownloadP7S from '../components/DocumentDownloadP7S';

const DocumentMenu = ({ t, ...rest }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const onClose = () => setAnchorEl();

  const { details } = rest;

  if (!details || !details.document) return null;
  const { fileId, fileName, fileType } = details.document;
  if (!fileId && !fileName && !fileType) return null;

  return (
    <>
      <Tooltip title={t('PDF')}>
        <IconButton
          onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
          size="large"
        >
          <PictureAsPdfIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={!!anchorEl}
        onClose={onClose}
        TransitionComponent={Fade}
      >
        <DocumentPreview onClose={onClose} {...rest} />
        <DocumentDownloadP7S onClose={onClose} {...rest} />
      </Menu>
    </>
  );
};

export default translate('ProcessesListPage')(DocumentMenu);
