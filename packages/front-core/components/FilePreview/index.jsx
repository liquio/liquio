import React, { Suspense, lazy } from 'react';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';

import Preloader from 'components/Preloader';
import PdfDocument from 'components/FilePreview/components/PdfDocument';
import CodeDocument from 'components/FilePreview/components/CodeDocument';
import UnsupportedComponent from 'components/FilePreview/components/UnsupportedComponent';

const XlsxViewer = lazy(() => import('components/FilePreview/components/xslx/xslx'));

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'relative',
    backgroundColor: '#ffffff',
    [theme.breakpoints.down('xl')]: {
      left: 'unset'
    },
    '& .rpv-core__viewer > div > div': {
      overflow: 'inherit!important'
    }
  },
  toolbar: {
    position: 'sticky',
    bottom: 0,
    padding: '0 10px'
  },
  unsupportedContainer: {
    padding: 40
  },
  printIcon: {
    position: 'absolute',
    bottom: 65,
    left: 10,
    [theme.breakpoints.down('xl')]: {
      display: 'none'
    }
  }
}));

const FilePreview = ({
  file,
  fileType,
  darkTheme,
  customToolbar,
  open,
  withPrint,
  hideMainPDF
}) => {
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
            darkTheme={darkTheme}
            customToolbar={customToolbar}
            open={open}
            withPrint={withPrint}
            hideMainPDF={hideMainPDF}
          />
        );
      case 'xlsx':
        return <XlsxViewer filePath={file} fileType={fileType} darkTheme={darkTheme} />;
      case 'json':
      case 'bpmn':
        return <CodeDocument file={file} fileType={fileType} />;
      default:
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
  };

  return (
    <div className={classNames(classes.root, classes[fileType])}>
      <Suspense fallback={<Preloader flex={true} />}>
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
