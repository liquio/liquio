import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { getDocumentWorkflowFiles } from 'application/actions/task';
import withStyles from '@mui/styles/withStyles';
import Preloader from 'components/Preloader';
import FileDataTable from 'components/FileDataTable';

const styles = {
  blockDisplay: {
    display: 'block',
  },
};

class PreviewDocument extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      files: [],
      loading: false,
    };
  }

  async componentDidMount() {
    const { demo } = this.props;

    if (!demo) {
      this.setState({ loading: true });
      await this.getData();
      this.setState({ loading: false });
    }
  }

  async componentDidUpdate(prevProps) {
    const { demo, stepName } = this.props;

    if (!demo && prevProps.stepName !== stepName) {
      this.setState({ loading: true });
      await this.getData();
      this.setState({ loading: false });
    }
  }

  getData = async () => {
    const {
      demo,
      onlyMainFile,
      previewActions,
      rootDocument,
      steps,
      activeStep,
    } = this.props;

    const workflowFiles = await previewActions.getDocumentWorkflowFiles(
      rootDocument.id,
      steps[activeStep],
    );

    const mainFile =
      workflowFiles &&
      workflowFiles.length &&
      workflowFiles.filter(({ isGenerated }) => isGenerated);

    if (demo) {
      return this.setState({ files: [] });
    }

    if (onlyMainFile) {
      return this.setState({ files: mainFile });
    }

    return this.setState({ files: workflowFiles });
  };

  render() {
    const {
      classes,
      actions: { ...actions },
      fileStorage,
      hidden,
      printAction,
      labels,
      withPrint,
    } = this.props;
    const { files, loading } = this.state;

    if (hidden) return null;

    return (
      <>
        {loading ? (
          <Preloader className={classes.blockDisplay} />
        ) : (
          <FileDataTable
            data={files}
            actions={actions}
            groupBy={labels ? 'labels' : undefined}
            asics={true}
            fileStorage={fileStorage}
            printAction={printAction}
            showCreatedDate={true}
            fieldBorder={false}
            withPrint={withPrint}
          />
        )}
      </>
    );
  }
}

PreviewDocument.propTypes = {
  actions: PropTypes.object,
  printAction: PropTypes.bool,
  // workflowFiles: PropTypes.object
};

PreviewDocument.defaultProps = {
  actions: {},
  printAction: false,
  //  workflowFiles: {}
};

// const mapStateToProps = ({ task }) => ({ workflowFiles: task && task.workflowFiles });

const mapDispatchToProps = (dispatch) => ({
  previewActions: {
    getDocumentWorkflowFiles: bindActionCreators(
      getDocumentWorkflowFiles,
      dispatch,
    ),
  },
});

const styled = withStyles(styles)(PreviewDocument);
export default connect(null, mapDispatchToProps)(styled);
