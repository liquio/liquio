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
import { JsonSchemaNode } from '../../types';

interface SpreadsheetError {
  path: string;
  [key: string]: unknown;
}

const normalizePath = (path = ''): string => {
  return path.replace(/\[/g, '.').replace(/\]/g, '');
};

const errorMap = (path: Array<string | number>) => (error: SpreadsheetError) => {
  const rowPath = normalizePath(error.path).split('.').slice(path.length);

  return {
    ...error,
    path: normalizePath(error.path),
    relativePath: rowPath,
    rowId: parseInt(rowPath[0], 10),
  };
};

const errorFilter = (path: Array<string | number>) => (error: SpreadsheetError) => {
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

interface SpreadsheetContainerProps {
  active?: boolean;
  sample?: string;
  description?: string;
  required?: boolean;
  error?: unknown;
  hidden?: boolean;
  value?: unknown[];
  headers?: Array<Array<{ label?: string } | string>>;
  items?: { properties?: Record<string, JsonSchemaNode> };
  onChange: (event: unknown) => void;
  name: string;
  readOnly?: boolean;
  hideReadOnlyActions?: boolean;
  htmlTemplate?: string;
  totalErrors?: number;
  height?: number | string;
  hiddenClearButton?: boolean;
  typography?: string;
  hiddenToolBar?: boolean;
  [key: string]: unknown;
}

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
}: SpreadsheetContainerProps) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  const { undo, redo, hasNext, hasPrevious } = useUndo(value, (newValue: unknown) => {
    (rest?.actions as { clearErrors?: () => void })?.clearErrors && (rest.actions as { clearErrors: () => void }).clearErrors();
    onChange(newValue);
  });

  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState(input(value, items));
  const [jumpTo, setJumpTo] = React.useState<{ rowId?: number; columnName?: string }>();

  const restErrors = rest.errors as SpreadsheetError[] | undefined;
  const cellError = restErrors && restErrors[0];
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
    restErrors &&
    restErrors.filter(errorFilter(rest.path as Array<string | number>)).map(errorMap(rest.path as Array<string | number>));

  return (
    <>
      <ElementGroupContainer
        description={description}
        sample={sample}
        className={classes.errored}
        // error={error || (cellError && checkPath ? new Error(t('TableError')) : null)}
        required={required}
        fullWidth={true}
        variant={typography as never}
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
                          arrayToData(arrayData as unknown[][], items),
                          true,
                          true,
                        ),
                      )
                    }
                  />
                  {hiddenClearButton ? null : (
                    <ClearDataButton
                      data={data as never}
                      readOnly={readOnly || !active}
                      onChange={onChange}
                      actions={rest.actions as never}
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
                  <EJVError error={tableError as never} />
                </Typography>
              ) : null}
            </>
          )
        }
        {...rest}
      >
        <SpreadsheetErrors
          t={t as never}
          items={items}
          errors={errors as never}
          headers={headers}
          setJumpTo={setJumpTo}
          totalErrors={totalErrors}
        />
        <Spreadsheet
          {...(rest as unknown as Record<string, unknown>)}
          undo={undo}
          redo={redo}
          name={name}
          items={items}
          headers={headers as never}
          height={height || 600}
          data={data as never}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          jumpTo={jumpTo}
          setJumpTo={setJumpTo}
          errors={errors as never}
          classes={classes as never}
        />
      </ElementGroupContainer>
      <FullScreenDialog
        open={open}
        title={description}
        disableEscapeKeyDown={true}
        onClose={() => setOpen(false)}
      >
        <Spreadsheet
          {...(rest as unknown as Record<string, unknown>)}
          name={name}
          items={items}
          headers={headers as never}
          height="100%"
          data={data as never}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          errors={errors as never}
          classes={classes as never}
        />
      </FullScreenDialog>
    </>
  );
};

class SpreadsheetRoot extends React.Component<SpreadsheetContainerProps> {
  shouldComponentUpdate(prevProps: SpreadsheetContainerProps) {
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
