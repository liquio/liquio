import React, { Component, Fragment } from 'react';
import { ImageListItem, ImageListItemBar } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import LinearProgress from '@mui/material/LinearProgress';

import attachesStyles from 'variables/styles/attaches';
import attachesWizardStep from 'variables/styles/attachesWizardStep';
import setComponentsId from 'helpers/setComponentsId';
import getAttachStates from 'helpers/getAttachStates';
import getAttachName from 'helpers/getAttachName';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import PreviewDialog from './PreviewDialog';
import PreviewButton from './PreviewButton';

interface AttachProps {
  setId?: (elementName: string) => string;
  requestPreview?: (...args: unknown[]) => unknown;
  fileName?: string;
  handleDownload?: () => void;
  classes: Record<string, string>;
  handleDelete?: () => void;
  name?: string;
  style?: React.CSSProperties;
  alwaysPreview?: boolean;
  url?: string;
  contentType?: string;
  userFileName?: string;
}

interface AttachState {
  busy: boolean;
  preview: string;
  loading: boolean;
  attempts: number;
  doc: string | Record<string, unknown> | null;
  itIsImage: boolean;
  itIsPDF: boolean;
  itIsBinary: boolean;
  openDialog: boolean;
  itIsGoogleViewDoc: boolean;
  itIsVideo: boolean;
  unknownFormat: boolean;
  showPreview: boolean;
  type: string;
  timerId: ReturnType<typeof setTimeout> | null;
  url: string;
  itIsHTML: boolean;
  file: string | Record<string, unknown> | null;
  format: string;
  text: string;
}

class Attach extends Component<AttachProps, AttachState> {
  static defaultProps: Partial<AttachProps> = {
    setId: setComponentsId('attach'),
    requestPreview: undefined,
    fileName: '',
    handleDownload: undefined,
    name: '',
    style: {},
    handleDelete: undefined,
    alwaysPreview: true,
    url: '',
    contentType: '',
    userFileName: ''
  };

  state: AttachState = {
    busy: false,
    preview: '',
    loading: !!this.props.requestPreview,
    attempts: 0,
    doc: null,
    itIsImage: false,
    itIsPDF: false,
    itIsBinary: false,
    openDialog: false,
    itIsGoogleViewDoc: false,
    itIsVideo: false,
    unknownFormat: false,
    showPreview: false,
    type: '',
    timerId: null,
    url: '',
    itIsHTML: false,
    file: null,
    format: '',
    text: ''
  };

  toggleDialog = () => {
    if (!this.state.loading) {
      this.setState({ openDialog: !this.state.openDialog });
    }
  };

  setDoc = getAttachStates.bind(this);

  componentWillReceiveProps(nextProps: AttachProps) {
    if (this.props.fileName !== nextProps.fileName) {
      this.setDoc();
    }
  }

  componentDidMount = this.setDoc;

  handleDownload = () => {
    const { name: propsName, fileName, userFileName } = this.props;
    const { file } = this.state;
    downloadBase64Attach(
      { propsName, fileName, userFileName } as unknown as Parameters<typeof downloadBase64Attach>[0],
      file as never,
    );
  };

  render() {
    const { classes, handleDelete, name, fileName, userFileName, style, setId } = this.props;
    const { busy } = this.state;
    return (
      <Fragment>
        <ImageListItem className={classes.gridItem} style={style} id={setId!('list-tile')}>
          {busy && (
            <LinearProgress className={classes.downloadProgress} id={setId!('linear-progress')} />
          )}
          <PreviewButton
            {...({
              ...this.props,
              ...this.state,
              toggleDialog: this.toggleDialog,
              handleDownload: this.handleDownload
            } as unknown as Record<string, unknown>)}
          />
          <ImageListItemBar
            title={getAttachName({ userFileName, name, fileName })}
            id={setId!('list-tile-button')}
            actionIcon={
              handleDelete && (
                <IconButton onClick={handleDelete} id={setId!('delete-button')} size="large">
                  <Icon className={classes.deleteAttachBtn}>close</Icon>
                </IconButton>
              )
            }
          />
        </ImageListItem>
        <PreviewDialog
          {...({
            ...this.state,
            setId: (elementName: string) => setId!(`preview-dialog-${elementName}`),
            name: getAttachName({ userFileName, name, fileName }),
            toggleDialog: this.toggleDialog,
            handleDownload: this.handleDownload
          } as unknown as Record<string, unknown>)}
        />
      </Fragment>
    );
  }
}

export default withStyles({
  ...attachesStyles,
  ...attachesWizardStep
} as never)(Attach as never) as unknown as React.ComponentType<Record<string, unknown>>;
