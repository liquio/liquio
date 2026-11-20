import React from 'react';
import { Icon, Button } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

import setComponentsId from 'helpers/setComponentsId';

// This styles object is empty (as in the original), so MUI injects an empty `classes`;
// every className below is always undefined at runtime. Preserved as-is.
const styles = {};

interface DOCPreviewProps extends WithStyles<typeof styles> {
  fileName?: string;
  setId?: (element: string) => string;
  docUrl?: string;
  handleDownload?: () => void;
}

const DOCPreview = ({ fileName = 'document', setId = setComponentsId('img-preview'), docUrl = '', classes, handleDownload }: DOCPreviewProps) => {
  const c = classes as Record<string, string | undefined>;
  return (
    <div id={setId('wrap')}>
      <iframe src={`https://docs.google.com/viewer?url=${docUrl}&embedded=true&a=bi`} frameBorder={0} title={fileName} />
      {/* setId is not a real Button prop; passed through as-is from the original (a no-op DOM attribute). */}
      <Button color="yellow" className={c.pdfDownload} onClick={handleDownload} {...{ setId: (elementName: string) => setId(`download-${elementName}`) }}>
        <Icon>save_alt</Icon>
      </Button>
    </div>
  );
};

export default withStyles(styles)(DOCPreview);
