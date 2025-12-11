import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import Dropzone from 'react-dropzone';
import Mime from 'components/Mime';
import { detect } from 'detect-browser';

import humanFileSize from 'helpers/humanFileSize';

const { name: browserName } = detect();

class SelectFileArea extends React.Component {
  state = { needChildDropzone: false };

  openBrowserWindow = () =>
    this.setState({ needChildDropzone: browserName === 'firefox' });

  limits() {
    const { t, accept, maxSize } = this.props;
    const limits = [];
    if (maxSize) {
      limits.push(t('MAX_FILE_SIZE_LIMIT', { size: humanFileSize(maxSize) }));
    }

    if (accept) {
      limits.push(
        t('FILE_TYPE_LIMIT', {
          types: <Mime>{accept}</Mime>,
        }),
      );
    }

    return limits.map((limit, index) => <div key={index}>{limit}</div>);
  }

  render() {
    const { t, classes, setId, maxSize, multiple, accept, onDrop } = this.props;
    const { needChildDropzone } = this.state;
    const children = ({ getRootProps, getInputProps }) => (
      <div className={classes.dropZone} {...getRootProps()}>
        <input {...getInputProps()} />
        {t('DROP_FILES')}
        <br id={setId('dropzone-line')} />
        <input {...getInputProps()} />
        <Button
          color="yellow"
          id={setId('dropzone-button')}
          setId={(elementName) => setId(`dropzone-${elementName}`)}
        >
          {t('SELECT_FILES')}
        </Button>
        {this.limits()}
      </div>
    );
    return (
      <Fragment>
        <div style={{ display: needChildDropzone ? 'none' : 'block' }}>
          <Dropzone
            accept={accept}
            maxSize={maxSize}
            multiple={multiple}
            activeClassName={classes.dropZoneActive}
            id={setId('dropzone')}
            onDrop={onDrop}
            onClick={this.openBrowserWindow}
          >
            {children}
          </Dropzone>
        </div>
        {needChildDropzone ? <SelectFileArea {...this.props} /> : null}
      </Fragment>
    );
  }
}

SelectFileArea.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  multiple: PropTypes.bool,
  accept: PropTypes.string,
  maxSize: PropTypes.number,
  setId: PropTypes.func,
  onDrop: PropTypes.func.isRequired,
};

SelectFileArea.defaultProps = {
  setId: setComponentsId('select-files-area'),
  multiple: false,
  accept: '',
  maxSize: null,
};

const styled = withStyles({})(SelectFileArea);
export default translate('SelectFileArea')(styled);
