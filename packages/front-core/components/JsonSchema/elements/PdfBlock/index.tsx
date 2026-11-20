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
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { translate, Translate } from 'react-translate';
import evaluate from 'helpers/evaluate';
import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  wrap: {
    maxWidth: '640px',
    '& #toolbar': {
      flexWrap: 'wrap' as const,
      gap: '16px',
      justifyContent: 'flex-start',
      paddingLeft: '30px',
      width: '100% !important',
      boxSizing: 'border-box' as const,
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

interface PdfBlockActions {
  uploadDocumentAttach: (file: Blob, labels: unknown, documentPath: string, meta: unknown, fileName: string) => Promise<unknown>;
  loadTaskAction: () => Promise<unknown>;
  setBusy: (busy: boolean) => void;
  handleDeleteFile: (file: unknown) => Promise<unknown>;
}

interface PdfBlockProps extends WithStyles<typeof styles> {
  pdfBlock: string;
  params?: Record<string, string> | null;
  rootDocument: { data: Record<string, unknown> };
  pdfName?: string;
  showPdf?: boolean;
  onChange?: (event: ChangeEvent) => void;
  stepName: string;
  path: Array<string | number>;
  t: Translate;
  actions: PdfBlockActions;
  buttonText?: string;
  landscape?: boolean;
}

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
}: PdfBlockProps) => {
  const getPdfName = () => {
    const dynamicName = pdfName;
    const result = evaluate(dynamicName, rootDocument.data);
    return (result instanceof Error ? dynamicName : result) as string;
  };

  const getBtnName = () => {
    const dynamicName = buttonText;
    const result = evaluate(dynamicName as string, rootDocument.data);
    return (result instanceof Error ? buttonText : result) as string;
  };

  const generatedDocument = useMemo(() => {
    let resolvedPdfBlock = pdfBlock;

    if (params) {
      const template = Handlebars.compile(resolvedPdfBlock);
      const templateData = Object.keys(params).reduce((acc, param) => {
        return {
          ...acc,
          [param]: objectPath.get(rootDocument.data, params[param]),
        };
      }, {});

      resolvedPdfBlock = template(templateData);
    }

    fonts.forEach((font) => {
      Font.register(font);
    });
    const pdfStyles = StyleSheet.create(pdfClasses);
    return (
      <Document>
        <Page style={pdfStyles.body} size="A4" orientation={landscape ? 'landscape' : 'portrait'}>
          <Html>{resolvedPdfBlock}</Html>
        </Page>
      </Document>
    );
  }, [params, pdfBlock, rootDocument]);
  const [instance, update] = usePDF({ document: generatedDocument });
  useEffect(() => {
    update(generatedDocument);
  }, [pdfBlock]);

  const handlePrint = () => {
    printJS(instance?.url as string);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = instance.url as string;
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

  const uploadFile = async (file: Blob, labels?: unknown) => {
    setBusy(true);

    const uploadedFile = await uploadDocumentAttach(
      file,
      labels,
      ([stepName] as Array<string | number>).concat(path).join('.'),
      {},
      `${getPdfName()}.pdf`,
    );

    await loadTaskAction();

    setBusy(false);

    if (!(uploadedFile instanceof Error)) {
      onChange && onChange(new ChangeEvent(uploadedFile, false, false, false));
    }
  };

  const deleteFile = async (file: unknown) => {
    setBusy(true);

    await handleDeleteFile(file);

    setBusy(false);
  };

  useEffect(() => {
    const handleUpload = async () => {
      if (instance.blob) {
        const prevFile = objectPath.get(
          rootDocument.data,
          ([stepName] as Array<string | number>).concat(path).join('.'),
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
