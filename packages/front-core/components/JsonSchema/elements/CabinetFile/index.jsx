import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  downloadDocumentAttach,
  downloadPDFDocument,
} from 'application/actions/task';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
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

class CabinetFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  titleTemplate = (attach) => `
        <div style="font-weight: bold">
            ${attach.name}
        </div>
        <div style="font-size: 90%">
            md5: ${attach.hash && attach.hash.md5} </br>
            sha1: ${attach.hash && attach.hash.sha1}</br>
            sha256: ${attach.hash && attach.hash.sha256}
        </div>
    `;

  getValue = () => {
    const { value } = this.props;

    if (!value) return [];

    const setAttachInfo = (attach) => {
      if (!Object.keys(attach).length) return null;
      return {
        ...attach,
        id: attach.attachId || attach.documentId,
        customName: this.titleTemplate(attach),
      };
    };

    if (value && Array.isArray(value))
      return value.map((item) => setAttachInfo(item))?.filter(Boolean);

    return [setAttachInfo(value)]?.filter(Boolean);
  };

  renderDataTable = () => {
    const { actions, fileStorage, isDocument } = this.props;
    const data = this.getValue();

    const handleDownloadFile = isDocument
      ? actions.downloadPDFDocument
      : actions.downloadDocumentAttach;

    return (
      <FileDataTable
        data={data}
        fileStorage={fileStorage}
        actions={{ handleDownloadFile }}
      />
    );
  };

  render = () => {
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
  };
}

CabinetFile.propTypes = {
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object,
  fileStorage: PropTypes.object,
  hidden: PropTypes.bool,
  description: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  isDocument: PropTypes.bool,
};

CabinetFile.defaultProps = {
  actions: {},
  fileStorage: {},
  hidden: false,
  description: null,
  value: null,
  isDocument: false,
};

const mapStateToProps = ({ files: { list } }) => ({ fileStorage: list });

const mapDispatchToProps = (dispatch) => ({
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
