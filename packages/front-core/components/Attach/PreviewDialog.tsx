import React from 'react';
import { translate } from 'react-translate';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import Icon from '@mui/material/Icon';
import cx from 'classnames';

import customInputStyle from 'variables/styles/customInputStyle';
import { Button } from 'components';
import PdfDocument from 'components/PDF';
import IMGPreview from 'components/IMG';
import DOCPreview from 'components/DOC';
import UnknownFormatRaw from 'components/UnknownFormat';
import HTMLPreviewRaw from 'components/HTMLPreview';
import TextPreview from 'components/TextPreview';
import MediaRaw from 'components/Media';

const Media = MediaRaw as unknown as React.ComponentType<Record<string, unknown>>;
const HTMLPreview = HTMLPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;
const UnknownFormat = UnknownFormatRaw as unknown as React.ComponentType<Record<string, unknown>>;

const style = {
  ...customInputStyle,
  dialog: {
    '& > :last-child': {
      ['@media (max-width:767px)']: {
        margin: '48px 10px',
        fontSize: '.7rem'
      }
    }
  },
  flexBox: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1rem',
    ['@media (max-width:425px)']: {
      display: 'block'
    }
  },
  previewLink: {
    ['@media (max-width:425px)']: {
      display: 'block',
      marginTop: 15
    }
  },
  smWidth: {
    ['@media (max-width:425px)']: {
      margin: 0,
      '& > div > div': {
        margin: 15
      }
    }
  }
};

const blankFormats = ['pdf', 'video', 'audio', 'image'];

interface PreviewDialogProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  setId: (elementName: string) => string;
  name?: string;
  toggleDialog: () => void;
  handleDownload: () => void;
  url: string;
  preview: string;
  doc?: string | Record<string, unknown> | null;
  openDialog: boolean;
  file?: string | Record<string, unknown> | null;
  format: string;
  text: string;
}

const PreviewDialog = ({
  t,
  classes,
  setId,
  name = 'Документ',
  toggleDialog,
  handleDownload,
  url,
  preview,
  doc = null,
  openDialog,
  file = null,
  format,
  text
}: PreviewDialogProps) => (
  <Dialog
    open={openDialog}
    onClose={toggleDialog}
    aria-labelledby={setId('title')}
    id={setId('')}
    className={cx(classes.dialog, classes.smWidth)}
  >
    <DialogTitle id={setId('title')} className={classes.dialogContentWrappers}>
      <div className={classes.flexBox}>
        <span>{name}</span>
        {file && blankFormats.includes(format) && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={t('PREVIEW_LINK')}
            className={classes.previewLink}
          >
            <Icon>open_in_new</Icon>
          </a>
        ) : null}
      </div>
    </DialogTitle>
    <DialogContent
      className={cx(classes.content, classes.dialogContentWrappers)}
      id={setId('content')}
    >
      {format === 'video' || format === 'audio' ? (
        <Media
          {...({
            setId: (elementName: string) => setId(`media-preview-${elementName}`),
            handleDownload,
            format,
            name,
            url
          } as unknown as Record<string, unknown>)}
        />
      ) : null}
      {format === 'pdf' ? (
        <PdfDocument
          {...({
            pdf: doc,
            setId: (elementName: string) => setId(`pdf-preview-${elementName}`),
            doc: file,
            fileName: name,
            modal: true
          } as unknown as Record<string, unknown>)}
        />
      ) : null}
      {format === 'image' ? (
        <IMGPreview
          {...({
            setId: (elementName: string) => setId(`img-preview-${elementName}`),
            imageUrl: preview,
            fileName: name,
            handleDownload
          } as unknown as Record<string, unknown>)}
        />
      ) : null}
      {format === 'googleViewDoc' ? (
        <DOCPreview
          {...({
            setId: (elementName: string) => setId(`doc-preview-${elementName}`),
            docUrl: url,
            fileName: name,
            handleDownload
          } as unknown as Record<string, unknown>)}
        />
      ) : null}
      {format === 'html' ? (
        <HTMLPreview
          {...({
            setId: (elementName: string) => setId(`doc-preview-${elementName}`),
            fileName: name,
            handleDownload,
            file,
            url,
            modal: true
          } as unknown as Record<string, unknown>)}
        />
      ) : null}
      {format === 'unknown' || format === 'binary' ? (
        <UnknownFormat
          {...({
            itIsBinary: format === 'binary',
            setId: (elementName: string) => setId(`unknown-preview-${elementName}`),
            handleDownload
          } as unknown as Record<string, unknown>)}
        />
      ) : null}
      {format === 'text' ? <TextPreview text={text} /> : null}
    </DialogContent>
    <DialogActions
      className={cx(classes.actions, classes.dialogContentWrappers)}
      id={setId('actions')}
    >
      <Button
        color="yellow"
        onClick={toggleDialog}
        setId={(elementName: string) => setId(`close-${elementName}`)}
      >
        {t('CLOSE')}
      </Button>
    </DialogActions>
  </Dialog>
);

const styled = withStyles(style)(PreviewDialog as never);

export default translate('Elements')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
