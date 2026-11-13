import React from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import Icon from '@mui/material/Icon';
import CircularProgress from '@mui/material/CircularProgress';
import { translate } from 'react-translate';
import PDFViewer from 'mgr-pdf-viewer-react';

interface PreviewButtonProps {
  classes: Record<string, string>;
  setId: (elementName: string) => string;
  busy: boolean;
  alwaysPreview: boolean;
  toggleDialog: () => void;
  handleDownload: () => void;
  loading: boolean;
  preview: string;
  doc?: string | Record<string, unknown> | null;
  showPreview: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
  format: string;
  url: string;
}

const PreviewButton = ({
  classes,
  setId,
  busy,
  alwaysPreview,
  toggleDialog,
  handleDownload,
  loading,
  preview,
  doc = null,
  showPreview,
  t,
  format,
  url
}: PreviewButtonProps) => (
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
        <PDFViewer document={{ url: doc as string }} scale={0.4} loader={<CircularProgress />} />
      </div>
    ) : null}
    {url && format === 'html' ? (
      <iframe title={'html'} src={url} className={classes.htmlFrame} />
    ) : null}
    <span className={classes.touchBackground} />
  </ButtonBase>
);

export default translate('ClaimList')(PreviewButton as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
