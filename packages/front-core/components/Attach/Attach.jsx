import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
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

class Attach extends Component {
  state = {
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

  componentWillReceiveProps(nextProps) {
    if (this.props.fileName !== nextProps.fileName) {
      this.setDoc();
    }
  }

  componentDidMount = this.setDoc;

  handleDownload = () => {
    const { name: propsName, fileName, userFileName } = this.props;
    const { file } = this.state;
    downloadBase64Attach({ propsName, fileName, userFileName }, file);
  };

  render() {
    const { classes, handleDelete, name, fileName, userFileName, style, setId } = this.props;
    const { busy } = this.state;
    return (
      <Fragment>
        <ImageListItem className={classes.gridItem} style={style} id={setId('list-tile')}>
          {busy && (
            <LinearProgress className={classes.downloadProgress} id={setId('linear-progress')} />
          )}
          <PreviewButton
            {...this.props}
            {...this.state}
            toggleDialog={this.toggleDialog}
            handleDownload={this.handleDownload}
          />
          <ImageListItemBar
            title={getAttachName({ userFileName, name, fileName })}
            id={setId('list-tile-button')}
            actionIcon={
              handleDelete && (
                <IconButton onClick={handleDelete} id={setId('delete-button')} size="large">
                  <Icon className={classes.deleteAttachBtn}>close</Icon>
                </IconButton>
              )
            }
          />
        </ImageListItem>
        <PreviewDialog
          {...this.state}
          setId={(elementName) => setId(`preview-dialog-${elementName}`)}
          name={getAttachName({ userFileName, name, fileName })}
          toggleDialog={this.toggleDialog}
          handleDownload={this.handleDownload}
        />
      </Fragment>
    );
  }
}

Attach.propTypes = {
  setId: PropTypes.func,
  requestPreview: PropTypes.func,
  fileName: PropTypes.string,
  handleDownload: PropTypes.func,
  classes: PropTypes.object.isRequired,
  handleDelete: PropTypes.func,
  name: PropTypes.string,
  style: PropTypes.object,
  alwaysPreview: PropTypes.bool,
  url: PropTypes.string,
  contentType: PropTypes.string,
  userFileName: PropTypes.string
};

Attach.defaultProps = {
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

export default withStyles({
  ...attachesStyles,
  ...attachesWizardStep
})(Attach);
