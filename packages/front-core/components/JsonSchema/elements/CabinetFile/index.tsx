import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import {
  downloadDocumentAttach,
  downloadPDFDocument,
} from 'application/actions/task';
import { Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import FileDataTable from 'components/FileDataTable';

const styles = {
  root: {
    marginTop: 10,
    marginBottom: 20,
  },
  label: {
    marginTop: 20,
  },
};

interface Attach {
  name?: string;
  hash?: { md5?: string; sha1?: string; sha256?: string };
  attachId?: string | number;
  documentId?: string | number;
  [key: string]: unknown;
}

interface CabinetFileProps extends WithStyles<typeof styles> {
  actions?: ReturnType<typeof mapDispatchToProps>['actions'];
  fileStorage?: Record<string, unknown>;
  hidden?: boolean;
  description?: string | null;
  value?: Attach | Attach[] | null;
  isDocument?: boolean;
}

class CabinetFile extends React.Component<CabinetFileProps> {
  static defaultProps = {
    actions: {},
    fileStorage: {},
    hidden: false,
    description: null,
    value: null,
    isDocument: false,
  };

  constructor(props: CabinetFileProps) {
    super(props);
  }

  titleTemplate = (attach: Attach) => `
        <div style="font-weight: bold">
            ${attach.name}
        </div>
        <div style="font-size: 90%">
            md5: ${attach.hash && attach.hash.md5} </br>
            sha1: ${attach.hash && attach.hash.sha1}</br>
            sha256: ${attach.hash && attach.hash.sha256}
        </div>
    `;

  getValue = (): Array<Attach & { id: string | number; customName: string }> => {
    const { value } = this.props;

    if (!value) return [];

    const setAttachInfo = (attach: Attach) => {
      if (!Object.keys(attach).length) return null;
      return {
        ...attach,
        id: attach.attachId || attach.documentId,
        customName: this.titleTemplate(attach),
      };
    };

    if (value && Array.isArray(value))
      return value.map((item) => setAttachInfo(item)).filter(Boolean) as Array<Attach & { id: string | number; customName: string }>;

    return [setAttachInfo(value as Attach)].filter(Boolean) as Array<Attach & { id: string | number; customName: string }>;
  };

  renderDataTable = () => {
    const { actions, fileStorage, isDocument } = this.props;
    const data = this.getValue();

    const handleDownloadFile = isDocument
      ? actions?.downloadPDFDocument
      : actions?.downloadDocumentAttach;

    return (
      <FileDataTable
        data={data}
        fileStorage={fileStorage}
        actions={{ handleDownloadFile }}
      />
    );
  };

  render() {
    const { hidden, classes, description } = this.props;

    if (hidden) return null;

    return (
      <div className={classes.root}>
        {description ? (
          <Typography variant="h5">{description}</Typography>
        ) : null}
        {this.renderDataTable()}
      </div>
    );
  }
}

const mapStateToProps = ({ files: { list } }: { files: { list: Record<string, unknown> } }) => ({ fileStorage: list });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    downloadDocumentAttach: bindActionCreators(
      downloadDocumentAttach,
      dispatch,
    ),
    downloadPDFDocument: bindActionCreators(downloadPDFDocument, dispatch),
  },
});

const styled = withStyles(styles)(CabinetFile);
export default connect(mapStateToProps, mapDispatchToProps)(styled);
