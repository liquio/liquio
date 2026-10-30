import React from 'react';
import { Icon, Button } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

import setComponentsId from 'helpers/setComponentsId';

// This styles object is empty (as in the original), so MUI injects an empty `classes`;
// every className below is always undefined at runtime. Preserved as-is.
const styles = {};

interface IMGPreviewProps extends WithStyles<typeof styles> {
  fileName?: string;
  setId?: (element: string) => string;
  imageUrl?: string;
  handleDownload?: () => void;
}

const IMGPreview = ({ fileName = 'image', setId = setComponentsId('img-preview'), imageUrl = '', classes, handleDownload }: IMGPreviewProps) => {
  const c = classes as Record<string, string | undefined>;
  return (
    <div id={setId('wrap')}>
      ?
      <img id={setId('full-preview')} src={imageUrl} width="100%" alt={fileName} />
      {/* setId is not a real Button prop; passed through as-is from the original (a no-op DOM attribute). */}
      <Button color="yellow" className={c.pdfDownload} onClick={handleDownload} {...{ setId: (elementName: string) => setId(`download-${elementName}`) }}>
        <Icon>save_alt</Icon>
      </Button>
    </div>
  );
};

export default withStyles(styles)(IMGPreview);
