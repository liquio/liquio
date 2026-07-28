/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import Dropzone from 'react-dropzone';
import { translate } from 'react-translate';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';
import Limits from 'components/JsonSchema/elements/SelectFiles/components/Limits';
import styles from 'components/JsonSchema/elements/SelectFiles/components/styles';
import { ReactComponent as UploadIcon } from 'assets/img/ic_upload.svg';

const SelectFileArea = ({
  t,
  classes,
  name,
  accept,
  maxSize,
  minSize,
  onSelect,
  multiple = true,
  renderContent,
  readOnly,
  onDropRejected,
  path,
}) => {
  const [active, setActive] = React.useState(false);
  const id = (path || []).join('-');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.closest('label').click();
    }
  }

  return (
    <Dropzone
      name={name}
      accept={accept}
      maxSize={maxSize || undefined}
      minSize={minSize}
      multiple={multiple}
      activeClassName={classes.dropZoneActive}
      onDragEnter={() => setActive(true)}
      onDragLeave={() => setActive(false)}
      onDropRejected={onDropRejected}
      noClick={true}
      onDrop={(val) => {
        onSelect(val);
        setActive(false);
      }}
    >
      {({ getRootProps, getInputProps }) => {
        const { onDragEnter, onDragLeave, onDragOver, onDrop } = getRootProps();
        return (
          <div
            className={classNames(classes.dropZone, {
              [classes.dropZoneActive]: active,
            })}
          >
            {!readOnly ? (
              <div {...getRootProps()} className={classes.focusedItem} aria-describedby={`${id}-error-region`}>
                <label {...getRootProps()} tabIndex={-1}>
                  <input id={id} {...getInputProps()} />
                  <div className={classes.uploadButtonContainer} tabIndex={-1} onKeyDown={handleKeyDown}>
                    <UploadIcon />
                    {t('DropFiles', {
                      link: (
                        <div className={classes.link}>{t('SelectFiles')}</div>
                      ),
                    })}
                  </div>
                </label>
                <Limits accept={accept} maxSize={maxSize} />
              </div>
            ) : null}
            {renderContent
              ? renderContent({ onDragEnter, onDragLeave, onDragOver, onDrop })
              : null}
          </div>
        );
      }}
    </Dropzone>
  );
};

const styled = withStyles(styles)(SelectFileArea);
export default translate('Elements')(styled);
