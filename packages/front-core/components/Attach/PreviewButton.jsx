import React from 'react';
import PropTypes from 'prop-types';
import ButtonBase from '@mui/material/ButtonBase';
import Icon from '@mui/material/Icon';
import CircularProgress from '@mui/material/CircularProgress';
import { translate } from 'react-translate';
import PDFViewer from 'mgr-pdf-viewer-react';

const PreviewButton = ({
  classes,
  setId,
  busy,
  alwaysPreview,
  toggleDialog,
  handleDownload,
  loading,
  preview,
  doc,
  showPreview,
  t,
  format,
  url
}) => (
  <ButtonBase
    disabled={busy}
    className={classes.downloadBtn}
    onClick={
      alwaysPreview && !loading && preview && !(format === 'unknown' || format === 'binary')
        ? toggleDialog
        : handleDownload
    }
    id={setId('button-base')}
    title={
      format === 'unknown' || format === 'binary'
        ? `${t('UNKNOWN_FORMAT')} ${format === 'binary' ? t('DOWNLOAD_ONLY') : t('NOT_SUPPORTED')}`
        : t('PREVIEW')
    }
  >
    {loading ? (
      <CircularProgress className={classes.fileImage} id={setId('circular-progress')} />
    ) : null}
    {!loading && preview && showPreview ? (
      <div
        className={classes.imagePreview}
        id={setId('preview')}
        style={{ backgroundImage: `url(${preview})` }}
      />
    ) : null}
    {format === 'binary' ||
    (!(doc && format === 'pdf') && !loading && (!preview || !showPreview)) ? (
      <Icon className={classes.fileImage} id={setId('description')}>
        {(format === 'unknown' || format === 'binary') && 'save_alt'}
        {format === 'googleViewDoc' && 'description'}
        {format === 'video' && 'video_label'}
        {format === 'audio' && 'audiotrack'}
      </Icon>
    ) : null}
    {(doc && format === 'pdf' && !preview) || !showPreview ? (
      <div className={classes.imagePreview} id={setId('preview')}>
        <PDFViewer document={{ url: doc }} scale={0.4} loader={<CircularProgress />} />
      </div>
    ) : null}
    {url && format === 'html' ? (
      <iframe title={'html'} src={url} className={classes.htmlFrame} />
    ) : null}
    <span className={classes.touchBackground} />
  </ButtonBase>
);

PreviewButton.propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired,
  setId: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  doc: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  showPreview: PropTypes.bool.isRequired,
  preview: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,

  alwaysPreview: PropTypes.bool.isRequired,
  handleDownload: PropTypes.func.isRequired,
  format: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};

PreviewButton.defaultProps = {
  doc: null
};

export default translate('ClaimList')(PreviewButton);
