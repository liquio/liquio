import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { getDocumentWorkflowFiles } from 'application/actions/task';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import PreloaderUntyped from 'components/Preloader';
import FileDataTableUntyped from 'components/FileDataTable';

const Preloader = PreloaderUntyped as unknown as React.ComponentType<Record<string, unknown>>;
const FileDataTable = FileDataTableUntyped as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  blockDisplay: {
    display: 'block',
  },
};

interface WorkflowFile {
  isGenerated?: boolean;
  [key: string]: unknown;
}

interface PreviewDocumentProps extends WithStyles<typeof styles> {
  demo?: boolean;
  stepName?: string;
  onlyMainFile?: boolean;
  previewActions: {
    getDocumentWorkflowFiles: (documentId: unknown, step: unknown) => Promise<WorkflowFile[]>;
  };
  rootDocument: { id?: string | number };
  steps: unknown[];
  activeStep: number;
  actions?: Record<string, unknown>;
  fileStorage?: unknown;
  hidden?: boolean;
  printAction?: boolean;
  labels?: unknown;
  withPrint?: boolean;
}

interface PreviewDocumentState {
  files: WorkflowFile[];
  loading: boolean;
}

class PreviewDocument extends React.Component<PreviewDocumentProps, PreviewDocumentState> {
  static defaultProps = {
    actions: {},
    printAction: false,
  };

  constructor(props: PreviewDocumentProps) {
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

  async componentDidUpdate(prevProps: PreviewDocumentProps) {
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
      return this.setState({ files: mainFile as WorkflowFile[] });
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  previewActions: {
    getDocumentWorkflowFiles: bindActionCreators(
      getDocumentWorkflowFiles as never,
      dispatch as never,
    ),
  },
});

const styled = withStyles(styles)(PreviewDocument);
export default connect(null, mapDispatchToProps)(styled as never);
