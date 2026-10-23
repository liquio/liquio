/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import Dropzone from 'react-dropzone';
import { translate, Translate } from 'react-translate';
import classNames from 'classnames';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import Limits from 'components/JsonSchema/elements/SelectFiles/components/Limits';
import styles from 'components/JsonSchema/elements/SelectFiles/components/styles';
import { ReactComponent as UploadIcon } from 'assets/img/ic_upload.svg';

interface SelectFileAreaProps extends WithStyles<typeof styles> {
  t: Translate;
  name?: string;
  accept?: string;
  maxSize?: number;
  minSize?: number;
  onSelect: (files: File[]) => void;
  multiple?: boolean;
  renderContent?: (dragEvents: Record<string, unknown>) => React.ReactNode;
  readOnly?: boolean | number;
  onDropRejected?: (rejected: File[]) => void;
  path?: Array<string | number>;
  [key: string]: unknown;
}

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
}: SelectFileAreaProps) => {
  const [active, setActive] = React.useState(false);
  const id = (path || []).join('-');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLElement).closest('label')?.click();
    }
  };

  return (
    <Dropzone
      accept={accept}
      maxSize={maxSize || undefined}
      minSize={minSize}
      multiple={multiple}
      // Neither `name` nor `activeClassName` are real react-dropzone v10 props
      // (this component computes its own `active` state and class instead) —
      // both silently no-op today. Preserved as-is.
      {...({ name, activeClassName: classes.dropZoneActive } as Record<string, unknown>)}
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
