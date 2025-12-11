import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslate } from 'react-translate';
import { pdfjs, Document, Page } from 'react-pdf';
import { IconButton, Select, MenuItem, Button } from '@mui/material';
import { makeStyles } from '@mui/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import classNames from 'classnames';
import printJS from 'print-js';

import { ReactComponent as PrintIcon } from 'assets/img/icon_print.svg';
import base64ToBlob from 'helpers/base64ToBlob';
import { getConfig } from '../../../../helpers/configLoader';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const useStyles = makeStyles((theme) => ({
  root: {
    overflow: 'auto'
  },
  wrapper: {
    overflow: 'auto',
    overflowY: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: '#F0F2F4',
    '& > *': {
      margin: 'auto',
      maxWidth: window.innerWidth,
      [theme.breakpoints.down('md')]: {
        boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.04)'
      },
      [theme.breakpoints.down('sm')]: {
        margin: 0,
        boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.04)'
      }
    }
  },
  zoomButton: {
    color: '#000',
    '&.Mui-disabled': {
      color: '#767676'
    }
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: 'auto',
    marginBottom: 24,
    paddingTop: 24
  },
  filterItem: {
    borderRadius: 4,
    background: '#FFFFFF',
    boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.04)',
    paddingLeft: 6,
    paddingRight: 6,
    display: 'flex',
    alignItems: 'center',
    '& > button:nth-of-type(2)': {
      [theme.breakpoints.down('md')]: {
        marginLeft: 8
      }
    },
    [theme.breakpoints.down('md')]: {
      justifyContent: 'flex-end',
      background: 'none',
      padding: '15px 7px 15px 0'
    }
  },
  select: {
    padding: '0 49px 0 0 !important'
  },
  selectRoot: {
    border: '1px solid #CFD4DA',
    background: '#FFFFFF',
    borderRadius: 4,
    marginLeft: 8,
    marginRight: 8,
    height: 6,
    paddingRight: 0
  },
  selectIcon: {
    borderLeft: '1px solid #CFD4DA',
    right: 1
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    border: 'none',
    width: 150,
    padding: 10
  },
  pageNumber: {
    position: 'fixed',
    bottom: 10,
    right: 10,
    background: '#ccc',
    padding: '5px 10px',
    borderRadius: '4px',
    color: '#333'
  },
  download: {
    backgroundColor: '#fff'
  },
  pdfBlock: {
    minWidth: '300px',
    boxShadow: 'none'
  }
}));

const TOOLBAR_WIDTH = 300;
const DEFAULT_ZOOM = window.innerWidth > 1060 ? 1060 : window.innerWidth;
const ZOOM_PERCENTAGES = [25, 50, 75, 100, 125, 150];

const PdfDocument = ({ file, customToolbar, open, withPrint, isPdfBlock }) => {
  const config = getConfig();

  if (config?.pdfWorkerLocal) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'js/pdfjs/pdf.worker.min.js',
      `${window.location.origin}`
    ).toString();
  } else {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }

  const isMobile = window.innerWidth < 1024;
  const t = useTranslate('TaskPage');
  const wrapperRef = React.useRef();
  const classes = useStyles();
  const [numPages, setNumPages] = useState(null);
  const [width, setWidth] = React.useState(() => {
    return isMobile ? (window.innerWidth - 10) * 2 : DEFAULT_ZOOM;
  });
  const [zoomPercentage, setZoomPercentage] = React.useState(50);
  const [page, setPage] = React.useState(1);
  const [currentPageOnScroll, setCurrentPageOnScroll] = React.useState(1);

  const handleScroll = () => {
    const spans = document.querySelectorAll('[id^="pdf-page-"]');

    let currentIndex = -1;

    spans.forEach((span, index) => {
      const rect = span.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.5) {
        currentIndex = index + 1;
      }
    });

    if (currentIndex !== -1) {
      setCurrentPageOnScroll(currentIndex);
    }
  };

  React.useEffect(() => {
    const scrollbarContainer = document.querySelector('[id^="scrollbar"]');

    if (scrollbarContainer) {
      scrollbarContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollbarContainer) {
        scrollbarContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const salt = React.useMemo(() => {
    return Math.random().toString(36).substring(7);
  }, []);

  const scrollToPage = React.useCallback(
    (page) => {
      const pageElement = document.getElementById(`pdf-page-${page}-${salt}`);
      setTimeout(() => {
        setPage(1);
        return pageElement?.scrollIntoView();
      }, 100);
    },
    [salt]
  );

  const handlePageChange = React.useCallback(
    (event) => {
      const newPage = event.target.value;
      setPage(newPage);
      scrollToPage(newPage);
    },
    [scrollToPage]
  );

  const handleZoomChange = React.useCallback((event) => {
    const selectedZoomPercentage = event.target.value;
    setZoomPercentage(selectedZoomPercentage);
  }, []);

  const handleIncreaseZoomByStep = React.useCallback(() => {
    const currentZoomPercentageIndex = ZOOM_PERCENTAGES.indexOf(zoomPercentage);
    const nextZoomPercentageIndex = currentZoomPercentageIndex + 1;
    const nextZoomPercentage = ZOOM_PERCENTAGES[nextZoomPercentageIndex];
    setZoomPercentage(nextZoomPercentage);
  }, [zoomPercentage]);

  const handleDecreaseZoomByStep = React.useCallback(() => {
    const currentZoomPercentageIndex = ZOOM_PERCENTAGES.indexOf(zoomPercentage);
    const nextZoomPercentageIndex = currentZoomPercentageIndex - 1;
    const nextZoomPercentage = ZOOM_PERCENTAGES[nextZoomPercentageIndex];
    setZoomPercentage(nextZoomPercentage);
  }, [zoomPercentage]);

  React.useEffect(() => {
    setWidth((zoomPercentage / 100) * (isMobile ? (window.innerWidth - 16) * 2 : DEFAULT_ZOOM));
  }, [zoomPercentage, isMobile]);

  const numPagesToArray = React.useMemo(() => {
    return [...Array(numPages)].map((x, i) => i + 1);
  }, [numPages]);

  const minZoomReached = React.useMemo(
    () => zoomPercentage === ZOOM_PERCENTAGES[0],
    [zoomPercentage]
  );
  const maxZoomReached = React.useMemo(
    () => zoomPercentage === ZOOM_PERCENTAGES[ZOOM_PERCENTAGES.length - 1],
    [zoomPercentage]
  );

  const renderValue = React.useCallback(
    (value) => t('From', { page: value, total: numPages }),
    [numPages, t]
  );

  const handlePrint = () => {
    const pdfBlob = base64ToBlob(file.split(',').pop());
    const url = URL.createObjectURL(pdfBlob);
    printJS(url);
  };

  const renderDocument = React.useMemo(() => {
    return () => (
      <Document
        file={file}
        loading={t('Loading')}
        noData={t('NoData')}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        {numPagesToArray.map((page, index) => (
          <span id={`pdf-page-${page}-${salt}`} key={index + salt}>
            <Page pageNumber={page} width={width} tabIndex="0" />
          </span>
        ))}
      </Document>
    );
  }, [file, numPagesToArray, salt, setNumPages, t, width]);

  if (open === false) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <div className={classes.root}>
          <div className={classes.wrapper} ref={wrapperRef}>
            <div
              className={classNames({
                [classes.filterItem]: true,
                [classes.pdfBlock]: isPdfBlock
              })}
            >
              {customToolbar}
            </div>
            <div tabIndex="0">
              {renderDocument()}
              {isMobile && numPages > 1 && (
                <div className={classes.pageNumber}>
                  {currentPageOnScroll} з {numPages}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={classes.root}>
          <div className={classes.wrapper} ref={wrapperRef}>
            <div
              className={classes.toolbar}
              style={{ width: DEFAULT_ZOOM - TOOLBAR_WIDTH }}
              id="toolbar"
            >
              <div className={classes.filterItem}>
                <IconButton
                  disabled={page === 1}
                  onClick={() => {
                    setPage(1);
                    scrollToPage(1);
                  }}
                  aria-label={t('PdfPreviewFirstPage')}
                  className={classes.zoomButton}
                  size="small"
                >
                  <FirstPageIcon />
                </IconButton>

                <IconButton
                  disabled={page === 1}
                  onClick={() => {
                    setPage(page - 1);
                    scrollToPage(page - 1);
                  }}
                  aria-label={t('PdfPreviewPreviousPage')}
                  className={classes.zoomButton}
                  size="small"
                >
                  <KeyboardArrowLeftIcon />
                </IconButton>

                <Select
                  value={page}
                  onChange={handlePageChange}
                  className={classes.selectRoot}
                  classes={{
                    select: classes.select,
                    icon: classes.selectIcon
                  }}
                  renderValue={renderValue}
                >
                  {numPagesToArray.map((page) => (
                    <MenuItem key={page + salt} value={page}>
                      {page}
                    </MenuItem>
                  ))}
                </Select>

                <IconButton
                  disabled={page === numPages}
                  onClick={() => {
                    setPage(page + 1);
                    scrollToPage(page + 1);
                  }}
                  aria-label={t('PdfPreviewNextPage')}
                  className={classes.zoomButton}
                  size="small"
                >
                  <KeyboardArrowRightIcon />
                </IconButton>

                <IconButton
                  disabled={page === numPages}
                  onClick={() => {
                    setPage(numPages);
                    scrollToPage(numPages);
                  }}
                  aria-label={t('PdfPreviewLastPage')}
                  className={classes.zoomButton}
                  size="small"
                >
                  <LastPageIcon />
                </IconButton>
              </div>

              {withPrint ? (
                <Button
                  onClick={handlePrint}
                  startIcon={<PrintIcon />}
                  className={classes.download}
                  aria-label={t('PrintBtn')}
                >
                  {t('PrintBtn')}
                </Button>
              ) : null}

              <div className={classes.filterItem}>
                <IconButton
                  disabled={minZoomReached}
                  onClick={handleDecreaseZoomByStep}
                  aria-label={t('PdfPreviewMinus')}
                  className={classes.zoomButton}
                  size="small"
                >
                  <RemoveIcon />
                </IconButton>

                <Select
                  value={zoomPercentage}
                  onChange={handleZoomChange}
                  className={classes.selectRoot}
                  classes={{
                    select: classes.select,
                    icon: classes.selectIcon
                  }}
                  aria-label={t('PdfPreviewZoom')}
                >
                  {ZOOM_PERCENTAGES.map((percentage) => (
                    <MenuItem key={percentage + salt} value={percentage}>
                      {percentage}%
                    </MenuItem>
                  ))}
                </Select>

                <IconButton
                  disabled={maxZoomReached}
                  onClick={handleIncreaseZoomByStep}
                  aria-label={t('PdfPreviewPlus')}
                  className={classes.zoomButton}
                  size="small"
                >
                  <AddIcon />
                </IconButton>
              </div>

              {customToolbar ? <div className={classes.filterItem}>{customToolbar}</div> : null}
            </div>

            <div tabIndex="0">{renderDocument()}</div>
          </div>
        </div>
      )}
    </>
  );
};

PdfDocument.propTypes = {
  file: PropTypes.string.isRequired,
  customToolbar: PropTypes.node,
  open: PropTypes.bool,
  withPrint: PropTypes.bool
};

PdfDocument.defaultProps = {
  customToolbar: null,
  open: true,
  withPrint: false
};

export default PdfDocument;
