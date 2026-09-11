import React, { Component, Fragment } from 'react';
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

interface AttachItem {
  name?: string;
  fileName?: string;
  userFileName?: string;
  contentType?: string;
  type?: string;
  mimeType?: string;
  attachId?: string;
  [key: string]: unknown;
}

interface AttachTableState {
  name: string;
  url: string;
  preview: string;
  doc: string | Record<string, unknown> | null;
  openDialog: boolean;
  file: File | Blob | null;
  format: string;
  activeAttach: AttachItem | null;
  text: string;
  type?: string;
  loading?: boolean;
}

const initalState: AttachTableState = {
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

interface AttachTableProps {
  list: AttachItem[];
  setId?: (elementName: string) => string;
  t: (key: string, params?: Record<string, unknown>) => string;
  dataSource: Record<string, unknown>;
  pagination: (...args: unknown[]) => void;
  changeCount: (...args: unknown[]) => void;
  dataIsLoading: boolean;
  classes: Record<string, string>;
  handleDownload: (attach: AttachItem) => () => Promise<unknown>;
  handleDelete?: (attach: AttachItem) => () => void;
}

class AttachTable extends Component<AttachTableProps, AttachTableState> {
  static defaultProps: Partial<AttachTableProps> = {
    setId: setComponentsId('claim-table'),
    handleDelete: undefined
  };

  state: AttachTableState = { ...initalState };

  setDocType = async (file: File | Blob, string = '') => {
    const text = string || ((await blobToTextEncoded('Windows-1251')(file)) as string);
    const formatingFile = await formatFile(file, text);
    const format = getFormat(formatingFile, text);
    const url = await getFileUrl(formatingFile, format, text);
    this.setState({ format, type: (file as File).type, url, text, file: formatingFile });
  };

  setDoc = (toggleDialog = false) => {
    const { handleDownload } = this.props;
    const { activeAttach } = this.state;
    this.setState({ doc: null, format: '', url: '', file: null });
    handleDownload(activeAttach as AttachItem)().then((file: unknown) => {
      if (file && typeof file === 'object' && !(file as { message?: unknown }).message) {
        blobToBase64(file).then((doc) =>
          this.setState(
            {
              doc: doc as string,
              preview: doc as string,
              loading: !doc
            } as unknown as AttachTableState,
            () => this.setDocType(file as File)
          )
        );
      }
      if (typeof file === 'string') {
        const blob = stringToBlob(file);
        this.setState({ loading: false } as unknown as AttachTableState, () => this.setDocType(blob, file));
      }
      if (typeof file === 'object' && file !== null && (file as { message?: unknown }).message) {
        const f = file as { message?: string };
        this.setState({
          text: file ? f.message || (file as unknown as string) : '',
          format: file ? 'text' : '',
          preview: '',
          doc: null
        });
      }
      toggleDialog && this.toggleDialog();
    });
  };

  toggleDialog = () => this.setState({ openDialog: !this.state.openDialog });

  openDialog = (attach: AttachItem) => () => {
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
    this.setState({ name: name as string });
  };

  handleDownload = (attach: AttachItem) => () =>
    this.props
      .handleDownload(attach)()
      .then((file: unknown) => {
        if (typeof file === 'string') {
          file = stringToBlob(file);
        }
        const { name, fileName, userFileName } = attach;
        downloadBase64Attach(
          { userFileName, propsName: name, fileName } as unknown as Parameters<typeof downloadBase64Attach>[0],
          file as never,
        );
      });

  getText = (item: AttachItem, key: string) => {
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
          {...({
            ...this.state,
            setId: (elementName: string) => setId!(`preview-dialog-${elementName}`),
            toggleDialog: this.toggleDialog,
            handleDownload: this.handleDownload(activeAttach as AttachItem)
          } as unknown as Record<string, unknown>)}
        />
      </div>
    );
  }
}

const translated = translate('Attach')(AttachTable as never);

const mapStateToProps = ({ datafetched: { loading: dataIsLoading } }: { datafetched: { loading: boolean } }) => ({
  dataIsLoading
});

export default connect(mapStateToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
