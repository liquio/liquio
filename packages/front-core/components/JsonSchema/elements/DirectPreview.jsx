import React from 'react';
import mime from 'mime-types';
import { useTranslate } from 'react-translate';
import { Tooltip, CircularProgress, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { ReactComponent as VisibilityIcon } from 'assets/img/visibility.svg';
import FileViewerDialog from 'components/FileViewerDialog';
import blobToBase64 from 'helpers/blobToBase64';
import evaluate from 'helpers/evaluate';
import classNames from 'classnames';

const blueIcon = (
  <img
    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bWFzayBpZD0ibWFzazBfMTYwNF8xMDY1OCIgc3R5bGU9Im1hc2stdHlwZTphbHBoYSIgbWFza1VuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeD0iMCIgeT0iMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IiNEOUQ5RDkiLz48L21hc2s+PGcgbWFzaz0idXJsKCNtYXNrMF8xNjA0XzEwNjU4KSI+PHBhdGggZD0iTTEyIDE2QzEzLjI1IDE2IDE0LjMxMjUgMTUuNTYyNSAxNS4xODc1IDE0LjY4NzVDMTYuMDYyNSAxMy44MTI1IDE2LjUgMTIuNzUgMTYuNSAxMS41QzE2LjUgMTAuMjUgMTYuMDYyNSA5LjE4NzUgMTUuMTg3NSA4LjMxMjVDMTQuMzEyNSA3LjQzNzUgMTMuMjUgNyAxMiA3QzEwLjc1IDcgOS42ODc1IDcuNDM3NSA4LjgxMjUgOC4zMTI1QzcuOTM3NSA5LjE4NzUgNy41IDEwLjI1IDcuNSAxMS41QzcuNSAxMi43NSA3LjkzNzUgMTMuODEyNSA4LjgxMjUgMTQuNjg3NUM5LjY4NzUgMTUuNTYyNSAxMC43NSAxNiAxMiAxNlpNMTIgMTQuMkMxMS4yNSAxNC4yIDEwLjYxMjUgMTMuOTM3NSAxMC4wODc1IDEzLjQxMjVDOS41NjI1IDEyLjg4NzUgOS4zIDEyLjI1IDkuMyAxMS41QzkuMyAxMC43NSA5LjU2MjUgMTAuMTEyNSAxMC4wODc1IDkuNTg3NUMxMC42MTI1IDkuMDYyNSAxMS4yNSA4LjggMTIgOC44QzEyLjc1IDguOCAxMy4zODc1IDkuMDYyNSAxMy45MTI1IDkuNTg3NUMxNC40Mzc1IDEwLjExMjUgMTQuNyAxMC43NSAxNC43IDExLjVDMTQuNyAxMi4yNSAxNC40Mzc1IDEyLjg4NzUgMTMuOTEyNSAxMy40MTI1QzEzLjM4NzUgMTMuOTM3NSAxMi43NSAxNC4yIDEyIDE0LjJaTTEyIDE5QzkuNTY2NjcgMTkgNy4zNSAxOC4zMjA4IDUuMzUgMTYuOTYyNUMzLjM1IDE1LjYwNDIgMS45IDEzLjc4MzMgMSAxMS41QzEuOSA5LjIxNjY3IDMuMzUgNy4zOTU4MyA1LjM1IDYuMDM3NUM3LjM1IDQuNjc5MTcgOS41NjY2NyA0IDEyIDRDMTQuNDMzMyA0IDE2LjY1IDQuNjc5MTcgMTguNjUgNi4wMzc1QzIwLjY1IDcuMzk1ODMgMjIuMSA5LjIxNjY3IDIzIDExLjVDMjIuMSAxMy43ODMzIDIwLjY1IDE1LjYwNDIgMTguNjUgMTYuOTYyNUMxNi42NSAxOC4zMjA4IDE0LjQzMzMgMTkgMTIgMTlaTTEyIDE3QzEzLjg4MzMgMTcgMTUuNjEyNSAxNi41MDQyIDE3LjE4NzUgMTUuNTEyNUMxOC43NjI1IDE0LjUyMDggMTkuOTY2NyAxMy4xODMzIDIwLjggMTEuNUMxOS45NjY3IDkuODE2NjcgMTguNzYyNSA4LjQ3OTE3IDE3LjE4NzUgNy40ODc1QzE1LjYxMjUgNi40OTU4MyAxMy44ODMzIDYgMTIgNkMxMC4xMTY3IDYgOC4zODc1IDYuNDk1ODMgNi44MTI1IDcuNDg3NUM1LjIzNzUgOC40NzkxNyA0LjAzMzMzIDkuODE2NjcgMy4yIDExLjVDNC4wMzMzMyAxMy4xODMzIDUuMjM3NSAxNC41MjA4IDYuODEyNSAxNS41MTI1QzguMzg3NSAxNi41MDQyIDEwLjExNjcgMTcgMTIgMTdaIiBmaWxsPSIjMDA2OEZGIi8+PC9nPjwvc3ZnPgo="
    alt="Переглянути виконавчий документ"
  />
);

const styles = (theme) => ({
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  previewText: {
    fontSize: 14,
    fontWeight: 500,
    marginRight: theme.spacing(1),
    letterSpacing: '0.10px',
  },
  blueIcon: {
    color: '#0068FF',
  },
});

const DirectPreview = ({
  url,
  text,
  rootDocument,
  blueColor,
  hiddenTooltip,
  classes,
  withPrint,
}) => {
  const [open, setOpen] = React.useState(false);
  const [blob, setBlob] = React.useState(null);
  const [fileType, setFileType] = React.useState(null);
  const [downloading, setDownloading] = React.useState(false);
  const t = useTranslate('FileDataTable');
  const evalUrl = evaluate(url, rootDocument.data);

  if (evalUrl instanceof Error) {
    console.log('Error: evaluate url error');
    return null;
  }

  const handleClickOpen = () => {
    setOpen(true);

    const fetchData = async () => {
      setDownloading(true);

      try {
        const response = await fetch(evalUrl);
        if (response.status !== 200) {
          throw new Error('Failed to fetch');
        }
        const responseToBlob = await response.blob();
        const decodedBlob = await blobToBase64(responseToBlob);
        const extension = mime.extension(responseToBlob.type);

        setFileType(extension);
        setBlob(decodedBlob);
      } catch (error) {
        console.error(error);
      } finally {
        setDownloading(false);
      }
    };

    fetchData();
  };

  const handleClose = () => setOpen(false);

  if (!url) return null;

  const fileSource = fileType === 'xlsx' ? blob : evalUrl;

  const Icon = downloading ? (
    <CircularProgress size={24} />
  ) : (
    <VisibilityIcon size={24} />
  );

  return (
    <>
      <Tooltip title={hiddenTooltip ? null : t('Preview')}>
        <div onClick={handleClickOpen} className={classes.previewContainer}>
          {text && (
            <Typography
              variant="h5"
              className={classNames({
                [classes.previewText]: true,
                [classes.blueIcon]: blueColor,
              })}
            >
              {text}
            </Typography>
          )}
          {blueColor ? blueIcon : Icon}
        </div>
      </Tooltip>

      <FileViewerDialog
        darkTheme={false}
        file={fileSource}
        fileName={url}
        open={open && !!fileType && !!blob}
        extension={fileType}
        onClose={handleClose}
        withPrint={withPrint}
      />
    </>
  );
};

export default withStyles(styles)(DirectPreview);
