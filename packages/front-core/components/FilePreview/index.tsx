import React, { Suspense, lazy } from 'react';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';
import { Theme } from '@mui/material/styles';

import Preloader from 'components/Preloader';
import PdfDocument from 'components/FilePreview/components/PdfDocument';
import CodeDocument from 'components/FilePreview/components/CodeDocument';
import UnsupportedComponent from 'components/FilePreview/components/UnsupportedComponent';

const XlsxViewer = lazy(() => import('components/FilePreview/components/xslx/xslx'));

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    position: 'relative' as const,
    backgroundColor: '#ffffff',
    [theme.breakpoints.down('xl')]: {
      left: 'unset'
    },
    '& .rpv-core__viewer > div > div': {
      overflow: 'inherit!important'
    }
  },
  toolbar: {
    position: 'sticky' as const,
    bottom: 0,
    padding: '0 10px'
  },
  unsupportedContainer: {
    padding: 40
  },
  printIcon: {
    position: 'absolute' as const,
    bottom: 65,
    left: 10,
    [theme.breakpoints.down('xl')]: {
      display: 'none'
    }
  }
}));

interface FilePreviewProps {
  file: string;
  fileType: string;
  darkTheme?: boolean;
  customToolbar?: React.ReactNode;
  open?: boolean;
  withPrint?: boolean;
  hideMainPDF?: boolean;
}

const FilePreview = ({
  file,
  fileType,
  darkTheme,
  customToolbar,
  open,
  withPrint,
  hideMainPDF
}: FilePreviewProps) => {
  const [error, setError] = React.useState(() => {
    if (!file) return false;
    return file.startsWith('data:') && file.split(',').filter(Boolean).length === 1;
  });
  const classes = useStyles();

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'jfif'].includes(fileType);

  const renderFile = () => {
    switch (fileType) {
      case 'pdf':
        return (
          <PdfDocument
            file={file}
            customToolbar={customToolbar}
            open={open}
            withPrint={withPrint}
            {...({ darkTheme, hideMainPDF } as unknown as Record<string, unknown>)}
          />
        );
      case 'xlsx':
        return <XlsxViewer filePath={file} fileType={fileType} darkTheme={darkTheme} />;
      case 'json':
      case 'bpmn':
        return <CodeDocument file={file} fileType={fileType} />;
      default: {
        const showStream = (file || '').replace(
          'data:application/octet-stream',
          `data:image/${fileType}`
        );

        return isImage ? (
          <img
            style={{ width: '100%' }}
            src={showStream}
            alt="Preview"
            onError={() => setError(true)}
          />
        ) : (
          <UnsupportedComponent />
        );
      }
    }
  };

  return (
    <div className={classNames(classes.root, (classes as Record<string, string>)[fileType])}>
      <Suspense fallback={<Preloader {...({ flex: true } as unknown as Record<string, unknown>)} />}>
        {error ? (
          <div className="unsupported-message">
            <UnsupportedComponent />
          </div>
        ) : (
          renderFile()
        )}
      </Suspense>
      <span />
    </div>
  );
};

export default FilePreview;
