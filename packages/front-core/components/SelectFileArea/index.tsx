import React, { Fragment } from 'react';
import setComponentsId from 'helpers/setComponentsId';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import Dropzone from 'react-dropzone';
import Mime from 'components/Mime';
import { detect } from 'detect-browser';

import humanFileSize from 'helpers/humanFileSize';

// The installed react-dropzone@10.2.1 exposes a different prop surface
// (activeClassName/id/onClick directly on <Dropzone>) than its own shipped
// .d.ts describes (a newer, useDropzone-based API) — a real version/types
// mismatch in the package itself.
const DropzoneAny = Dropzone as unknown as React.ComponentType<Record<string, unknown>>;

const { name: browserName } = detect()!;

interface SelectFileAreaProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  multiple?: boolean;
  accept?: string;
  maxSize?: number | null;
  setId?: (elementName: string) => string;
  onDrop: (files: File[]) => void;
}

interface SelectFileAreaState {
  needChildDropzone: boolean;
}

class SelectFileArea extends React.Component<SelectFileAreaProps, SelectFileAreaState> {
  static defaultProps = {
    setId: setComponentsId('select-files-area'),
    multiple: false,
    accept: '',
    maxSize: null,
  };

  state: SelectFileAreaState = { needChildDropzone: false };

  openBrowserWindow = () =>
    this.setState({ needChildDropzone: browserName === 'firefox' });

  limits() {
    const { t, accept, maxSize } = this.props;
    const limits: React.ReactNode[] = [];
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
    const children = ({ getRootProps, getInputProps }: { getRootProps: () => Record<string, unknown>; getInputProps: () => Record<string, unknown> }) => (
      <div className={classes.dropZone} {...getRootProps()}>
        <input {...getInputProps()} />
        {t('DROP_FILES')}
        <br id={setId?.('dropzone-line')} />
        <input {...getInputProps()} />
        <Button
          color="yellow"
          id={setId?.('dropzone-button')}
          {...({ setId: (elementName: string) => setId?.(`dropzone-${elementName}`) } as unknown as Record<string, unknown>)}
        >
          {t('SELECT_FILES')}
        </Button>
        {this.limits()}
      </div>
    );
    return (
      <Fragment>
        <div style={{ display: needChildDropzone ? 'none' : 'block' }}>
          <DropzoneAny
            accept={accept}
            maxSize={maxSize}
            multiple={multiple}
            activeClassName={classes.dropZoneActive}
            id={setId?.('dropzone')}
            onDrop={onDrop}
            onClick={this.openBrowserWindow}
          >
            {children}
          </DropzoneAny>
        </div>
        {needChildDropzone ? <SelectFileArea {...this.props} /> : null}
      </Fragment>
    );
  }
}

const styled = withStyles({})(SelectFileArea as never);
export default translate('SelectFileArea')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
