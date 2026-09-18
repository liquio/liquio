import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';

import { downloadFilePreview } from 'application/actions/files';
import { downloadDocumentAttachPreview } from 'application/actions/task';
import noimage from 'assets/img/noimage.svg';

const styles = {
  container: {
    height: 150,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center'
  }
};

interface FileLike {
  id?: string;
  downloadToken?: string;
  documentId?: string;
  fileLink?: string;
}

interface FilePreviewProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  file: FileLike;
  previews: Record<string, unknown>;
  actions: {
    downloadFilePreview: (file: FileLike) => Promise<unknown>;
    downloadDocumentAttachPreview: (file: FileLike) => Promise<unknown>;
  };
}

interface FilePreviewState {
  preview: string | null;
  formatError: boolean;
}

class FilePreview extends React.Component<FilePreviewProps, FilePreviewState> {
  constructor(props: FilePreviewProps) {
    super(props);
    this.state = {
      preview: null,
      formatError: false
    };
  }

  componentDidMount = () => this.init(this.props);

  componentWillReceiveProps = (newProps: FilePreviewProps) => {
    const { file } = this.props;

    if (file.id !== newProps.file.id || file.downloadToken !== newProps.file.downloadToken) {
      this.init(newProps);
    }
  };

  init = async ({ file, previews, actions }: FilePreviewProps) => {
    let preview;
    if (file.downloadToken) {
      preview = previews[file.downloadToken] || (await actions.downloadFilePreview(file));
    } else if (file.documentId && (file.id || file.fileLink)) {
      preview =
        previews[(file.id || file.fileLink) as string] ||
        (await actions.downloadDocumentAttachPreview(file));
    }

    if (preview instanceof Error) {
      this.setState({ preview: noimage, formatError: true });
    }
  };

  render = () => {
    const { t, classes, file, previews } = this.props;
    const { formatError } = this.state;
    const preview =
      (previews[file.id as string] as string) ||
      (previews[file.downloadToken as string] as string) ||
      this.state.preview;

    if (formatError) {
      return <div className={classes.container}>{t('UnsupportedFormat')}</div>;
    }

    return <div className={classes.container} style={{ backgroundImage: `url(${preview})` }} />;
  };
}

const mapStateToProps = ({ files }: { files?: { previews?: Record<string, unknown> } }) => {
  return { previews: files ? files.previews : {} };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    downloadFilePreview: bindActionCreators(downloadFilePreview, dispatch),
    downloadDocumentAttachPreview: bindActionCreators(downloadDocumentAttachPreview, dispatch)
  }
});

const styled = withStyles(styles)(FilePreview as never);
const translated = translate('TaskPage')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps as never)(translated as never);
