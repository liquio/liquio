import React from 'react';
import { Icon, Button } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

// This styles object is empty (as in the original), so MUI injects an empty `classes`;
// every className below is always undefined at runtime. Preserved as-is.
const styles = {};

interface HTMLPreviewProps extends WithStyles<typeof styles> {
  file: File | Blob;
  url?: string;
  fileName?: string;
  handleDownload?: () => void;
}

const HTMLPreview = ({ file, url = '', fileName = 'document', classes, handleDownload }: HTMLPreviewProps) => {
  const c = classes as Record<string, string | undefined>;
  const src = url || URL.createObjectURL(file);
  return (
    <div className={c.htmlWrap}>
      <div className={c.htmlScrollBox}>
        <div className={c.htmlBox}>
          <iframe title={fileName} src={src} className={c.htmlFrame} />
        </div>
      </div>
      <div className={c.htmlActions}>
        <Button color="yellow" onClick={handleDownload}>
          <Icon>save_alt</Icon>
        </Button>
      </div>
    </div>
  );
};

export default withStyles(styles)(HTMLPreview);
