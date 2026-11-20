import React from 'react';
import { translate } from 'react-translate';

import { Fade, IconButton, Menu, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import DocumentPreviewRaw from '../components/DocumentPreview';
import DocumentDownloadP7SRaw from '../components/DocumentDownloadP7S';

const DocumentPreview = DocumentPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DocumentDownloadP7S = DocumentDownloadP7SRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DocumentMenuProps {
  t: (key: string) => string;
  details?: { document?: { fileId?: string | number; fileName?: string; fileType?: string } };
  [key: string]: unknown;
}

const DocumentMenu = ({ t, ...rest }: DocumentMenuProps) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | undefined | null>(null);
  const onClose = () => setAnchorEl(undefined);

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

export default translate('ProcessesListPage')(DocumentMenu as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
