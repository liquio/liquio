import React, { Component } from 'react';
import setComponentsId from 'helpers/setComponentsId';
import cx from 'classnames';

import { Icon, Paper, Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import Preloader from 'components/Preloader';
import PDFViewer from 'mgr-pdf-viewer-react';

// import styles from 'variables/styles/pdfDocument';

const PrevNavigationButton = ({ handlePrevClick, page }: { handlePrevClick: () => void; page: number }) => {
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

const NextNavigationButton = ({ handleNextClick, page, pages = null }: { handleNextClick: () => void; page: number; pages?: number | null }) => {
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

const NavigationPageLabel = withStyles({})(
  ({ classes, page, pages }: { classes: Record<string, string>; page: number; pages?: number }) => (
    <Typography
      variant="h6"
      className={cx(
        classes.pageLabel,
        page === pages && classes.pageLabelWithoutButtons,
      )}
    >
      {page} / {pages}
    </Typography>
  ) as never,
) as unknown as React.ComponentType<Record<string, unknown>>;

interface PdfDocumentProps {
  classes: Record<string, string>;
  pdf?: string;
  setId?: (elementName: string) => string;
  doc?: Blob | string | null;
  fileName?: string;
  modal?: boolean;
}

interface PdfDocumentState {
  scale: number | null;
}

class PdfDocument extends Component<PdfDocumentProps, PdfDocumentState> {
  static defaultProps = {
    setId: setComponentsId('pdf-document'),
    pdf: '',
    doc: null,
    fileName: 'Заява',
    modal: false,
  };

  state: PdfDocumentState = { scale: null };
  wrap: HTMLDivElement | null = null;

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

  setScale = (scale: number) => this.setState({ scale });

  downloadPdf = () => {
    const { doc, fileName } = this.props;
    downloadBase64Attach({ fileName, ...({ contentType: 'pdf' } as unknown as Record<string, unknown>) }, doc);
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
        <Paper className={classes.pdfDocument} id={setId?.('')}>
          {scale && (
            <PDFViewer
              navigation={{
                elements: {
                  previousPageBtn: PrevNavigationButton as never,
                  nextPageBtn: NextNavigationButton as never,
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
            id={setId?.('download-button')}
            {...({ setId: (elementName: string) => setId?.(`download-${elementName}`) } as unknown as Record<string, unknown>)}
          >
            <Icon>save_alt</Icon>
          </Button>
        </Paper>
      </div>
    );
  }
}

// decorate and export
export default withStyles({})(PdfDocument as never) as unknown as React.ComponentType<Record<string, unknown>>;
