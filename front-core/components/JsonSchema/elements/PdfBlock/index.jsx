import React, { useEffect, useMemo } from 'react';
import PdfDocument from 'components/FilePreview/components/PdfDocument';
import Handlebars from 'components/JsonSchema/helpers/handlebarsHelpers';
import objectPath from 'object-path';
import { Document, Page, Font, StyleSheet, usePDF } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import {
  pdfClasses,
  fonts,
} from 'components/JsonSchema/elements/PdfBlock/settings';
import printJS from 'print-js';
import { Button } from '@mui/material';
import { ReactComponent as PrintIcon } from 'assets/img/icon_print.svg';
import { ReactComponent as DownloadIcon } from 'assets/img/ic_download.svg';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import evaluate from 'helpers/evaluate';

const styles = (theme) => ({
  wrap: {
    maxWidth: '640px',
    '& #toolbar': {
      flexWrap: 'wrap',
      gap: '16px',
      justifyContent: 'flex-start',
      paddingLeft: '30px',
      width: '100% !important',
      boxSizing: 'border-box'
    },
  },
  download: {
    backgroundColor: '#fff'
  },
  icon: {
    '& path, & line': {
      stroke: theme.palette.primary.main
    }
  }
});

const PdfBlock = ({
  pdfBlock,
  params,
  rootDocument,
  pdfName = '',
  showPdf,
  onChange,
  stepName,
  path,
  classes,
  t,
  actions: { uploadDocumentAttach, loadTaskAction, setBusy, handleDeleteFile },
  buttonText,
  landscape
}) => {
  const getPdfName = () => {
    const dynamicName = pdfName;
    const result = evaluate(dynamicName, rootDocument.data);
    return result instanceof Error ? dynamicName : result;
  };

  const getBtnName = () => {
    const dynamicName = buttonText;
    const result = evaluate(dynamicName, rootDocument.data);
    return result instanceof Error ? buttonText : result;
  };

  const generatedDocument = useMemo(() => {
    if (params) {
      const template = Handlebars.compile(pdfBlock);
      const templateData = Object.keys(params).reduce((acc, param) => {
        return {
          ...acc,
          [param]: objectPath.get(rootDocument.data, params[param]),
        };
      }, {});

      pdfBlock = template(templateData);
    }

    fonts.forEach((font) => {
      Font.register(font);
    });
    const styles = StyleSheet.create(pdfClasses);
    return (
      <Document>
        <Page style={styles.body} size="A4" orientation={landscape ? 'landscape' : 'portrait'}>
          <Html>{pdfBlock}</Html>
        </Page>
      </Document>
    );
  }, [params, pdfBlock, rootDocument]);
  const [instance, update] = usePDF({ document: generatedDocument });
  useEffect(() => {
    update(generatedDocument);
  }, [pdfBlock]);

  const handlePrint = () => {
    printJS(instance?.url);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = instance.url;
    a.download = getPdfName();
    a.click();
  };

  const customToolbar = (
    <>
      <Button
        onClick={handlePrint}
        startIcon={<PrintIcon />}
        className={classes.download}
      >
        {t('Print')}
      </Button>
      <Button
        onClick={handleDownload}
        startIcon={<DownloadIcon />}
        className={classes.download}
      >
        {getBtnName() || t('Download')}
      </Button>
    </>
  );

  const uploadFile = async (file, labels) => {
    setBusy(true);

    const uploadedFile = await uploadDocumentAttach(
      file,
      labels,
      [].concat(stepName, path).join('.'),
      {},
      `${getPdfName()}.pdf`,
    );

    await loadTaskAction();

    setBusy(false);

    if (!(uploadedFile instanceof Error)) {
      onChange && onChange(new ChangeEvent(uploadedFile, false, false, false));
    }
  };

  const deleteFile = async (file) => {
    setBusy(true);

    await handleDeleteFile(file);

    setBusy(false);
  };

  useEffect(() => {
    const handleUpload = async () => {
      if (instance.blob) {
        const prevFile = objectPath.get(
          rootDocument.data,
          [stepName].concat(path).join('.'),
        );
        if (prevFile) {
          await deleteFile(prevFile);
        }
        await uploadFile(instance.blob);
      }
    };

    !instance?.loading && handleUpload();
  }, [instance]);

  if (!showPdf) return (
    <Button
      variant="outlined"
      onClick={handleDownload}
      startIcon={<DownloadIcon className={classes.icon} />}
      className={classes.download}
    >
      {getBtnName() || t('Download')}
    </Button>
  );

  return (
    <div className={classes.wrap}>
      {instance?.url && !instance?.loading ? (
        <PdfDocument file={instance?.url || ''} customToolbar={customToolbar} isPdfBlock={true} />
      ) : null}
    </div>
  );
};

const styled = withStyles(styles)(PdfBlock);

export default translate('PdfBlock')(styled);
