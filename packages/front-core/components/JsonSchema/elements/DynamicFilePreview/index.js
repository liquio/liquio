import React from 'react';
import FileViewerDialog from 'components/FileViewerDialog';
import objectPath from 'object-path';
import { useTranslate } from 'react-translate';
import mime from 'mime-types';
import {
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import withStyles from '@mui/styles/withStyles';
import evaluate from 'helpers/evaluate';

const styles = () => ({
  saveLink: {
    color: 'rgba(0, 0, 0, 0.54)',
    display: 'inherit',
  },
  minWidth: {
    minWidth: 120,
  },
});

const DynamicFilePreview = (props) => {
  const {
    rootDocument,
    dataPath,
    description,
    notRequiredLabel,
    sample,
    required,
    error,
    hidden,
    classes,
    steps,
    value,
    activeStep,
    parentValue,
  } = props;
  const t = useTranslate('WorkflowPage');
  const [showPreview, setShowPreview] = React.useState(false);
  const [fileName, setFileName] = React.useState(null);
  const [extension, setExtension] = React.useState(null);
  const showPreviewDialog = React.useCallback((item) => {
    setShowPreview(item.url);
    setFileName(item?.name);
    setExtension(mime.extension(item?.type));
  }, []);

  if (dataPath) {
    let files = evaluate(
      dataPath,
      value,
      rootDocument?.data?.[steps?.[activeStep]] || {},
      rootDocument?.data || {},
      parentValue || {},
    );

    if (files instanceof Error) {
      files = objectPath.get(rootDocument.data, dataPath);
    }

    if (!files) return null;

    if (hidden) return null;

    return (
      <>
        <ElementContainer
          description={description}
          notRequiredLabel={notRequiredLabel}
          sample={sample}
          required={required}
          error={error}
          bottomSample={true}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align={'left'} padding={'none'}>
                    {t('Name')}
                  </TableCell>
                  <TableCell align={'left'} padding={'normal'}>
                    {t('Actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(files || []).map((file, index) => (
                  <TableRow key={index}>
                    <TableCell align={'left'} padding={'none'}>
                      {file.name}
                    </TableCell>
                    <TableCell
                      align={'left'}
                      padding={'none'}
                      className={classes.minWidth}
                    >
                      <Tooltip title={t('ShowPreview')}>
                        <IconButton
                          onClick={() => showPreviewDialog(file)}
                          aria-label={t('ShowPreview')}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('DownloadFile')}>
                        <IconButton aria-label={t('DownloadFile')}>
                          <a
                            href={file.url}
                            download
                            aria-label={t('DownloadFile')}
                            className={classes.saveLink}
                          >
                            <SaveAltIcon />
                          </a>
                        </IconButton>
                      </Tooltip>
                      {file.p7sUrl ? (
                        <Tooltip title={t('DownloadFileP7S')}>
                          <IconButton aria-label={t('DownloadFileP7S')}>
                            <a
                              href={file.p7sUrl}
                              download
                              aria-label={t('DownloadFileP7S')}
                              className={classes.saveLink}
                            >
                              <VpnKeyIcon />
                            </a>
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <FileViewerDialog
            file={showPreview}
            fileName={fileName}
            open={!!showPreview}
            extension={extension}
            onClose={() => setShowPreview(false)}
          />
        </ElementContainer>
      </>
    );
  }

  return null;
};

const styled = withStyles(styles)(DynamicFilePreview);

export default styled;
