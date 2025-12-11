import React from 'react';
import { useTranslate } from 'react-translate';

import { IconButton, Typography, Tooltip } from '@mui/material';
import { makeStyles } from '@mui/styles';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

import FullScreenDialog from 'components/FullScreenDialog';
import { ElementGroupContainer, ChangeEvent } from 'components/JsonSchema';
import EJVError from 'components/JsonSchema/components/EJVError';

import Spreadsheet from 'components/JsonSchema/elements/Spreadsheet/Spreadsheet';
import ClearDataButton from 'components/JsonSchema/elements/Spreadsheet/ClearDataButton';
import ExportToPdfButton from 'components/JsonSchema/elements/Spreadsheet/ExportToPdfButton';
import ImportFromXlsButton from 'components/JsonSchema/elements/Spreadsheet/ImportFromXlsButton';
import SpreadsheetErrors from 'components/JsonSchema/elements/Spreadsheet/SpreadsheetErrors';

import {
  input,
  arrayToData,
} from 'components/JsonSchema/elements/Spreadsheet/dataMapping';

import useUndo from 'hooks/useUndo';
import diff from 'helpers/diff';

const normalizePath = (path = '') => {
  return path.replace(/\[/g, '.').replace(/\]/g, '');
};

const errorMap = (path) => (error) => {
  const rowPath = normalizePath(error.path).split('.').slice(path.length);

  return {
    ...error,
    path: normalizePath(error.path),
    relativePath: rowPath,
    rowId: parseInt(rowPath[0], 10),
  };
};

const errorFilter = (path) => (error) => {
  const errorPath = normalizePath(error.path).split('.');
  const rootPath = errorPath.slice(0, path.length);

  if (rootPath.length !== path.length) {
    return false;
  }

  return !rootPath.filter((row, index) => row !== path[index]).length;
};

const useStyles = makeStyles(() => ({
  errored: {
    color: '#000',
  },
  grow: {
    flexGrow: 1,
  },
  errorMessage: {
    marginLeft: 16,
    color: '#f44336',
  },
  paper: {
    paddingTop: 5,
  },
}));

const SpreadsheetContainer = ({
  active,
  sample,
  description,
  required,
  error,
  hidden,
  value,
  headers = [],
  items = {},
  onChange,
  name,
  readOnly,
  hideReadOnlyActions,
  htmlTemplate,
  totalErrors,
  height,
  hiddenClearButton,
  typography,
  hiddenToolBar,
  ...rest
}) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  const { undo, redo, hasNext, hasPrevious } = useUndo(value, (newValue) => {
    rest?.actions?.clearErrors && rest.actions.clearErrors();
    onChange(newValue);
  });

  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState(input(value, items));
  const [jumpTo, setJumpTo] = React.useState();

  const cellError = rest.errors && rest.errors[0];
  const checkPath = cellError && cellError.path.split('.').shift() === name;

  React.useEffect(() => {
    const diffs = diff(data, input(value, items));
    if (diffs && diffs.length) {
      setData(input(value, items));
    }
  }, [value, items]);

  if (hidden) return null;

  const tableError =
    error || (cellError && checkPath ? new Error(t('TableError')) : null);

  const errors =
    rest.errors &&
    rest.errors.filter(errorFilter(rest.path)).map(errorMap(rest.path));

  return (
    <>
      <ElementGroupContainer
        description={description}
        sample={sample}
        className={classes.errored}
        // error={error || (cellError && checkPath ? new Error(t('TableError')) : null)}
        required={required}
        fullWidth={true}
        variant={typography}
        actionButtons={
          !hiddenToolBar && (
            <>
              <Tooltip title={t('ToggleFullscreen')}>
                <IconButton
                  onClick={() => setOpen(true)}
                  color="inherit"
                  aria-label={t('ToggleFullscreen')}
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
              <ExportToPdfButton value={value} htmlTemplate={htmlTemplate} />

              {hideReadOnlyActions && readOnly ? null : (
                <>
                  <ImportFromXlsButton
                    readOnly={readOnly || !active}
                    onImport={(arrayData) =>
                      onChange(
                        new ChangeEvent(
                          arrayToData(arrayData, items),
                          true,
                          true,
                        ),
                      )
                    }
                  />
                  {hiddenClearButton ? null : (
                    <ClearDataButton
                      data={data}
                      readOnly={readOnly || !active}
                      onChange={onChange}
                      actions={rest.actions}
                    />
                  )}
                  <Tooltip title={t('Undo')}>
                    <IconButton
                      disabled={!hasPrevious || readOnly || !active}
                      onClick={undo}
                      aria-label={t('Undo')}
                    >
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('Redo')}>
                    <IconButton
                      disabled={!hasNext || readOnly || !active}
                      onClick={redo}
                      aria-label={t('Redo')}
                    >
                      <RedoIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {tableError ? (
                <Typography className={classes.errorMessage}>
                  <EJVError error={tableError} />
                </Typography>
              ) : null}
            </>
          )
        }
        {...rest}
      >
        <SpreadsheetErrors
          t={t}
          items={items}
          errors={errors}
          headers={headers}
          setJumpTo={setJumpTo}
          totalErrors={totalErrors}
        />
        <Spreadsheet
          {...rest}
          undo={undo}
          redo={redo}
          name={name}
          items={items}
          headers={headers}
          height={height || 600}
          data={data}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          jumpTo={jumpTo}
          setJumpTo={setJumpTo}
          errors={errors}
          classes={classes}
        />
      </ElementGroupContainer>
      <FullScreenDialog
        open={open}
        title={description}
        disableEscapeKeyDown={true}
        onClose={() => setOpen(false)}
      >
        <Spreadsheet
          {...rest}
          name={name}
          items={items}
          headers={headers}
          height="100%"
          data={data}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          errors={errors}
          classes={classes}
        />
      </FullScreenDialog>
    </>
  );
};

class SpreadsheetRoot extends React.Component {
  shouldComponentUpdate(prevProps) {
    return (
      !!diff(prevProps.value, this.props.value) ||
      !!diff(prevProps.errors, this.props.errors) ||
      prevProps.active !== this.props.active ||
      prevProps.readOnly !== this.props.readOnly ||
      prevProps.hidden !== this.props.hidden
    );
  }

  render() {
    return <SpreadsheetContainer {...this.props} />;
  }
}

export default SpreadsheetRoot;
