import React from 'react';

import { translate, Translate } from 'react-translate';
import setComponentsId from 'helpers/setComponentsId';

import { Icon, Button } from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';

// This styles object is empty (as in the original), so MUI injects an empty `classes`;
// every className below is always undefined at runtime. Preserved as-is.
const styles = {};

interface MediaProps extends WithStyles<typeof styles> {
  setId?: (element: string) => string;
  handleDownload?: () => void;
  format: string;
  name: string;
  url: string;
  t: Translate;
}

const Media = ({ setId = setComponentsId('img-preview'), classes, handleDownload, format, name, url }: MediaProps) => {
  const c = classes as Record<string, string | undefined>;
  return (
    <div id={setId('wrap')} className={c.mediaBox}>
      {format === 'video' && (
        <video autoPlay={false} className={c.videoFrame} controls={true}>
          <source src={url} />
          <track label={name} kind="captions" />
        </video>
      )}
      {format === 'audio' && (
        <audio autoPlay={false} controls={true}>
          <source src={url} />
          <track label={name} kind="captions" />
        </audio>
      )}
      {/* setId is not a real Button prop; passed through as-is from the original (a no-op DOM attribute). */}
      <Button color="yellow" className={c.pdfDownload} onClick={handleDownload} {...{ setId: (elementName: string) => setId(`download-${elementName}`) }}>
        <Icon>save_alt</Icon>
      </Button>
    </div>
  );
};

const styled = withStyles(styles)(Media);
const translated = translate('ClaimList')(styled);

export default translated;
