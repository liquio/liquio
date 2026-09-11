import React, { Component } from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import cx from 'classnames';

import { Icon, Paper, Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import Preloader from 'components/Preloader';
import PDFViewer from 'mgr-pdf-viewer-react';

// import styles from 'variables/styles/pdfDocument';

const PrevNavigationButton = ({ handlePrevClick, page }) => {
  if (page === 1) {
    return null;
  }
  return (
    <Button
      variant="contained"
      color="yellow"
      onClick={handlePrevClick}
      disabled={page === 1}
    >
      <Icon>arrow_back</Icon>
    </Button>
  );
};

PrevNavigationButton.propTypes = {
  handlePrevClick: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
};

const NextNavigationButton = ({ handleNextClick, page, pages }) => {
  if (page === pages) return null;
  return (
    <Button
      variant="contained"
      color="yellow"
      onClick={handleNextClick}
      disabled={page === pages}
    >
      <Icon>arrow_forward</Icon>
    </Button>
  );
};

NextNavigationButton.propTypes = {
  handleNextClick: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  pages: PropTypes.number,
};

NextNavigationButton.defaultProps = {
  pages: null,
};

const NavigationPageLabel = withStyles({})(({ classes, page, pages }) => (
  <Typography
    variant="h6"
    className={cx(
      classes.pageLabel,
      page === pages && classes.pageLabelWithoutButtons,
    )}
  >
    {page} / {pages}
  </Typography>
));

class PdfDocument extends Component {
  state = { scale: null };
  wrap = null;

  componentDidMount() {
    const {
      wrap,
      props: { modal },
    } = this;
    let scale = modal ? 0.9 : 1;
    if (!modal && wrap && wrap.offsetWidth < 618) {
      if (wrap.offsetWidth < 625) {
        scale = (wrap.offsetWidth - 30) / 595;
      }
    }
    this.setScale(scale);
  }

  setScale = (scale) => this.setState({ scale });

  downloadPdf = () => {
    const { doc, fileName } = this.props;
    downloadBase64Attach({ fileName, contentType: 'pdf' }, doc);
  };

  render() {
    const { classes, pdf, setId } = this.props;
    const { scale } = this.state;

    if (!pdf) {
      return <Preloader />;
    }

    return (
      <div
        ref={(c) => {
          this.wrap = c;
        }}
        className={classes.pdfWrap}
      >
        <Paper className={classes.pdfDocument} id={setId('')}>
          {scale && (
            <PDFViewer
              navigation={{
                elements: {
                  previousPageBtn: PrevNavigationButton,
                  nextPageBtn: NextNavigationButton,
                  pages: NavigationPageLabel,
                },
              }}
              document={{ url: pdf }}
              scale={scale}
              loader={<Preloader />}
            />
          )}
          <Button
            variant="contained"
            color="yellow"
            className={classes.pdfDownload}
            onClick={this.downloadPdf}
            id={setId('download-button')}
            setId={(elementName) => setId(`download-${elementName}`)}
          >
            <Icon>save_alt</Icon>
          </Button>
        </Paper>
      </div>
    );
  }
}

PdfDocument.propTypes = {
  classes: PropTypes.object.isRequired,
  pdf: PropTypes.string,
  setId: PropTypes.func,
  doc: PropTypes.object,
  fileName: PropTypes.string,
  modal: PropTypes.bool,
};

PdfDocument.defaultProps = {
  setId: setComponentsId('pdf-document'),
  pdf: '',
  doc: null,
  fileName: 'Заява',
  modal: false,
};

// decorate and export
export default withStyles({})(PdfDocument);
