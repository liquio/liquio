import React from 'react';
import PropTypes from 'prop-types';
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
import UnknownFormat from 'components/UnknownFormat';
import HTMLPreview from 'components/HTMLPreview';
import TextPreview from 'components/TextPreview';
import Media from 'components/Media';

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

const PreviewDialog = ({
  t,
  classes,
  setId,
  name,
  toggleDialog,
  handleDownload,
  url,
  preview,
  doc,
  openDialog,
  file,
  format,
  text
}) => (
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
          setId={(elementName) => setId(`media-preview-${elementName}`)}
          handleDownload={handleDownload}
          format={format}
          name={name}
          url={url}
        />
      ) : null}
      {format === 'pdf' ? (
        <PdfDocument
          pdf={doc}
          setId={(elementName) => setId(`pdf-preview-${elementName}`)}
          doc={file}
          fileName={name}
          modal={true}
        />
      ) : null}
      {format === 'image' ? (
        <IMGPreview
          setId={(elementName) => setId(`img-preview-${elementName}`)}
          imageUrl={preview}
          fileName={name}
          handleDownload={handleDownload}
        />
      ) : null}
      {format === 'googleViewDoc' ? (
        <DOCPreview
          setId={(elementName) => setId(`doc-preview-${elementName}`)}
          docUrl={url}
          fileName={name}
          handleDownload={handleDownload}
        />
      ) : null}
      {format === 'html' ? (
        <HTMLPreview
          setId={(elementName) => setId(`doc-preview-${elementName}`)}
          fileName={name}
          handleDownload={handleDownload}
          file={file}
          url={url}
          modal={true}
        />
      ) : null}
      {format === 'unknown' || format === 'binary' ? (
        <UnknownFormat
          itIsBinary={format === 'binary'}
          setId={(elementName) => setId(`unknown-preview-${elementName}`)}
          handleDownload={handleDownload}
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
        setId={(elementName) => setId(`close-${elementName}`)}
      >
        {t('CLOSE')}
      </Button>
    </DialogActions>
  </Dialog>
);

PreviewDialog.propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  setId: PropTypes.func.isRequired,
  url: PropTypes.string.isRequired,
  doc: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  format: PropTypes.string.isRequired,
  openDialog: PropTypes.bool.isRequired,
  name: PropTypes.string,
  preview: PropTypes.string.isRequired,
  handleDownload: PropTypes.func.isRequired,
  file: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  text: PropTypes.string.isRequired
};

PreviewDialog.defaultProps = {
  doc: null,
  file: null,
  name: 'Документ'
};

const styled = withStyles(style)(PreviewDialog);

export default translate('Elements')(styled);
