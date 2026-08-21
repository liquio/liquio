import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
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

class FilePreview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      preview: null,
      formatError: false
    };
  }

  componentDidMount = () => this.init(this.props);

  componentWillReceiveProps = (newProps) => {
    const { file } = this.props;

    if (file.id !== newProps.file.id || file.downloadToken !== newProps.file.downloadToken) {
      this.init(newProps);
    }
  };

  init = async ({ file, previews, actions }) => {
    let preview;
    if (file.downloadToken) {
      preview = previews[file.downloadToken] || (await actions.downloadFilePreview(file));
    } else if (file.documentId && (file.id || file.fileLink)) {
      preview =
        previews[file.id || file.fileLink] || (await actions.downloadDocumentAttachPreview(file));
    }

    if (preview instanceof Error) {
      this.setState({ preview: noimage, formatError: true });
    }
  };

  render = () => {
    const { t, classes, file, previews } = this.props;
    const { formatError } = this.state;
    const preview = previews[file.id] || previews[file.downloadToken] || this.state.preview;

    if (formatError) {
      return <div className={classes.container}>{t('UnsupportedFormat')}</div>;
    }

    return <div className={classes.container} style={{ backgroundImage: `url(${preview})` }} />;
  };
}

const mapStateToProps = ({ files }) => {
  return { previews: files ? files.previews : {} };
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    downloadFilePreview: bindActionCreators(downloadFilePreview, dispatch),
    downloadDocumentAttachPreview: bindActionCreators(downloadDocumentAttachPreview, dispatch)
  }
});

const styled = withStyles(styles)(FilePreview);
const translated = translate('TaskPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
