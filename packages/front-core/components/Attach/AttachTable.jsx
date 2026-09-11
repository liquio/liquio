import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { IconButton, LinearProgress } from '@mui/material';
import { connect } from 'react-redux';
import { Visibility, SaveAlt, Close } from '@mui/icons-material';

import setComponentsId from 'helpers/setComponentsId';
import { Table } from 'components';
import blobToBase64 from 'helpers/blobToBase64';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import { blobToTextEncoded } from 'helpers/blobToText';
import stringToBlob from 'helpers/stringToBlob';
import getFormat from 'helpers/getAttachFormat';
import formatFile from 'helpers/formatFile';
import getFileUrl from 'helpers/getFileUrl';
import getAttachName from 'helpers/getAttachName';
import PreviewDialog from './PreviewDialog';

const fields = {
  pagination: true,
  tableFields: [
    { key: 'name', title: 'NAME', classNames: ['cell'], grid: [1, 4, 1, 2] },
    { key: 'type', title: 'TYPE', classNames: ['cell'], grid: [1, 4, 3, 4] },
    {
      key: 'icon',
      title: 'PREVIEW',
      classNames: ['cell', 'textRight'],
      grid: [5, 7, 1, 4]
    }
  ]
};

const initalState = {
  name: '',
  url: '',
  preview: '',
  doc: '',
  openDialog: false,
  file: null,
  format: '',
  activeAttach: null,
  text: ''
};

class AttachTable extends Component {
  state = { ...initalState };

  setDocType = async (file, string = '') => {
    const text = string || (await blobToTextEncoded('Windows-1251')(file));
    const formatingFile = await formatFile(file, text);
    const format = getFormat(formatingFile, text);
    const url = await getFileUrl(formatingFile, format, text);
    this.setState({ format, type: file.type, url, text, file: formatingFile });
  };

  setDoc = (toggleDialog = false) => {
    const { handleDownload } = this.props;
    const { activeAttach } = this.state;
    this.setState({ doc: null, format: '', url: '', file: null });
    handleDownload(activeAttach)().then((file) => {
      if (file && typeof file === 'object' && !file.message) {
        blobToBase64(file).then((doc) =>
          this.setState(
            {
              doc,
              preview: doc,
              loading: !doc
            },
            () => this.setDocType(file)
          )
        );
      }
      if (typeof file === 'string') {
        const blob = stringToBlob(file);
        this.setState({ loading: false }, () => this.setDocType(blob, file));
      }
      if (typeof file === 'object' && file.message) {
        this.setState({
          text: file ? file.message || file : '',
          format: file ? 'text' : '',
          preview: '',
          doc: null
        });
      }
      toggleDialog && this.toggleDialog();
    });
  };

  toggleDialog = () => this.setState({ openDialog: !this.state.openDialog });

  openDialog = (attach) => () => {
    const { activeAttach } = this.state;
    const { contentType, fileName, name: attachName, userFileName, type, mimeType } = attach;
    const name = userFileName || attachName || fileName;
    const format = getFormat({ type: contentType || type || mimeType || '' });
    if (format === 'binary' || format === 'unknown') {
      this.handleDownload(attach)();
    } else if (
      activeAttach &&
      activeAttach.attachId === attach.attachId &&
      this.state.name === name
    ) {
      this.setState({ openDialog: true });
    } else {
      this.setState({ ...initalState, activeAttach: attach }, () => this.setDoc(true));
    }
    this.setState({ name });
  };

  handleDownload = (attach) => () =>
    this.props
      .handleDownload(attach)()
      .then((file) => {
        if (typeof file === 'string') {
          file = stringToBlob(file);
        }
        const { name, fileName, userFileName } = attach;
        downloadBase64Attach({ userFileName, propsName: name, fileName }, file);
      });

  getText = (item, key) => {
    const { t, classes, dataIsLoading, handleDelete } = this.props;
    const { contentType, fileName, name, type, mimeType, userFileName } = item;
    const format = getFormat({ type: contentType || type || mimeType || '' });
    switch (key) {
      case 'name':
        return getAttachName({ userFileName, name, fileName, item });
      case 'type':
        return t(format.toUpperCase());
      case 'icon':
        return (
          <Fragment>
            <IconButton
              color="inherit"
              onClick={this.openDialog(item)}
              className={classes.menuButton}
              disabled={format === 'binary' || format === 'unknown' || dataIsLoading}
              size="large"
            >
              <Visibility />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={!dataIsLoading ? this.handleDownload(item) : () => null}
              className={classes.menuButton}
              disabled={dataIsLoading}
              size="large"
            >
              <SaveAlt />
            </IconButton>
            {handleDelete && (
              <IconButton
                color="inherit"
                onClick={!dataIsLoading ? handleDelete(item) : () => null}
                className={classes.menuButton}
                disabled={dataIsLoading}
                size="large"
              >
                <Close />
              </IconButton>
            )}
          </Fragment>
        );
      default:
        return item[key];
    }
  };

  render() {
    const { list, t, setId, pagination, changeCount, dataSource, dataIsLoading, classes } =
      this.props;
    const { activeAttach } = this.state;
    return (
      <div className={classes.relativePosition}>
        {dataIsLoading && <LinearProgress className={classes.absolutePosition} />}
        <Table
          fields={fields}
          getText={this.getText}
          setId={setId}
          onCheckItem={() => null}
          pagination={pagination}
          changeCount={changeCount}
          list={list}
          t={t}
          labelRowsPerPage="COUNT"
          labelDisplayedRows="DISPLAYED"
          needFullData={true}
          dataSource={dataSource}
        />
        {dataIsLoading && <LinearProgress className={classes.absolutePosition} />}
        <PreviewDialog
          {...this.state}
          setId={(elementName) => setId(`preview-dialog-${elementName}`)}
          toggleDialog={this.toggleDialog}
          handleDownload={this.handleDownload(activeAttach)}
        />
      </div>
    );
  }
}

AttachTable.propTypes = {
  list: PropTypes.array.isRequired,
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  dataSource: PropTypes.object.isRequired,
  pagination: PropTypes.func.isRequired,
  changeCount: PropTypes.func.isRequired,
  dataIsLoading: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired,
  handleDownload: PropTypes.func.isRequired,
  handleDelete: PropTypes.func
};

AttachTable.defaultProps = {
  setId: setComponentsId('claim-table'),
  handleDelete: undefined
};

const translated = translate('Attach')(AttachTable);

const mapStateToProps = ({ datafetched: { loading: dataIsLoading } }) => ({
  dataIsLoading
});

export default connect(mapStateToProps)(translated);
