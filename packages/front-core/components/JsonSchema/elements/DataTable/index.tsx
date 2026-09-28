import React from 'react';
import { useTranslate } from 'react-translate';
import { Button, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

import FullScreenDialog from 'components/FullScreenDialog';
import { ElementGroupContainer, EJVError } from 'components/JsonSchema';
import DataTable from 'components/JsonSchema/elements/DataTable/DataTable';
import SpreadsheetErrors from 'components/JsonSchema/elements/Spreadsheet/SpreadsheetErrors';

import {
  input,
  output,
} from 'components/JsonSchema/elements/Spreadsheet/dataMapping';

import diff from 'helpers/diff';
import { JsonSchemaNode } from '../../types';

interface DataTableError {
  path: string;
  [key: string]: unknown;
}

const errorMap = (path: Array<string | number>) => (error: DataTableError) => {
  const rowPath = error.path.split('.').slice(path.length);

  return {
    ...error,
    relativePath: rowPath,
    rowId: parseInt(rowPath[0], 10),
  };
};

const errorFilter = (path: Array<string | number>) => (error: DataTableError) => {
  const errorPath = error.path.split('.');
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
  btnFullScreen: {
    fontSize: 12,
  },
}));

interface DataTableContainerProps {
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
  outsideEditScreen?: boolean;
  typography?: string;
  [key: string]: unknown;
}

const DataTableContainer = ({
  sample,
  description,
  required,
  error,
  hidden,
  value = [],
  headers = [],
  items = {},
  onChange,
  name,
  readOnly,
  outsideEditScreen,
  typography,
  ...rest
}: DataTableContainerProps) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  const [dataValue, setDataValue] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  const [jumpTo, setJumpTo] = React.useState<{ rowId?: number; columnName?: string }>();

  React.useEffect(() => {
    if (diff(dataValue, value)) {
      setDataValue(value);
    }
  }, [value]);

  const data = input(dataValue, items);
  const restErrors = rest.errors as DataTableError[] | undefined;
  const cellError = restErrors && restErrors[0];
  const checkPath = cellError && cellError.path.split('.').shift() === name;

  const setChanges = (newValue: unknown[]) => {
    if (outsideEditScreen) {
      onChange(newValue);
    } else {
      (rest.actions as { applyDocumentDiffs: (diffs: unknown, path: unknown[]) => void }).applyDocumentDiffs(
        diff(dataValue, newValue),
        ([rest.stepName] as unknown[]).concat(rest.path as unknown[]),
      );
    }
  };

  const handleCellsChange = (changes: unknown[], additions: unknown[]) =>
    !readOnly &&
    output(
      (val: unknown) => {
        const newValue = (val as { data?: unknown[] })?.data || (val as unknown[]);

        if (diff(dataValue, newValue)) {
          setDataValue([...(newValue as unknown[])]);
          setChanges(newValue as unknown[]);
        }
      },
      dataValue,
      items,
    )(changes as never, additions as never);

  const handleChange = ({ value, row, propName }: { value: unknown; row: number; propName: string }) => {
    const newValue: Record<string, unknown>[] = JSON.parse(JSON.stringify(dataValue));

    if (!newValue[row]) {
      newValue[row] = {};
      (rest.actions as { applyDocumentDiffs: (diffs: unknown, path: unknown[]) => void }).applyDocumentDiffs(
        diff(dataValue, newValue),
        ([rest.stepName] as unknown[]).concat(rest.path as unknown[]),
      );
      (dataValue as Record<string, unknown>[])[row] = {};
      newValue[row][propName] = (value as { data?: unknown })?.data || value;
      (rest.actions as { applyDocumentDiffs: (diffs: unknown, path: unknown[]) => void }).applyDocumentDiffs(
        diff(dataValue, newValue),
        ([rest.stepName] as unknown[]).concat(rest.path as unknown[]),
      );
      return;
    }

    newValue[row][propName] = (value as { data?: unknown })?.data || value;
    setDataValue(newValue as unknown[]);
    setChanges(newValue as unknown[]);
  };

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
        required={required}
        fullWidth={true}
        variant={typography as never}
        actionButtons={
          <>
            <Button
              onClick={() => setOpen(true)}
              color="inherit"
              startIcon={<FullscreenIcon />}
              classes={{
                label: classes.btnFullScreen,
              } as Record<string, string>}
              disableRipple
              disableFocusRipple
            >
              {t('ToggleFullscreen')}
            </Button>

            {tableError ? (
              <Typography className={classes.errorMessage}>
                <EJVError error={tableError as never} />
              </Typography>
            ) : null}
          </>
        }
        {...rest}
      >
        <SpreadsheetErrors
          t={t as never}
          items={items}
          errors={errors as never}
          headers={headers}
          setJumpTo={setJumpTo}
        />
        <DataTable
          {...rest}
          path={rest.path as never}
          schema={rest.schema as never}
          name={name}
          items={items}
          headers={headers as never}
          height={600}
          data={data}
          value={dataValue}
          readOnly={readOnly}
          jumpTo={jumpTo}
          setJumpTo={setJumpTo}
          errors={errors}
          onChange={handleChange}
          onCellsChanged={handleCellsChange}
        />
      </ElementGroupContainer>
      <FullScreenDialog
        open={open}
        title={description}
        onClose={() => setOpen(false)}
      >
        <DataTable
          {...rest}
          path={rest.path as never}
          schema={rest.schema as never}
          name={name}
          items={items}
          headers={headers as never}
          height="100%"
          data={data}
          value={dataValue}
          readOnly={readOnly}
          setJumpTo={setJumpTo}
          errors={errors}
          onChange={handleChange}
          onCellsChanged={handleCellsChange}
        />
      </FullScreenDialog>
    </>
  );
};

export default DataTableContainer;
