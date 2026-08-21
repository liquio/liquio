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

const errorMap = (path) => (error) => {
  const rowPath = error.path.split('.').slice(path.length);

  return {
    ...error,
    relativePath: rowPath,
    rowId: parseInt(rowPath[0], 10),
  };
};

const errorFilter = (path) => (error) => {
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
}) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  const [dataValue, setDataValue] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  const [jumpTo, setJumpTo] = React.useState();

  React.useEffect(() => {
    if (diff(dataValue, value)) {
      setDataValue(value);
    }
  }, [value]);

  const data = input(dataValue, items);
  const cellError = rest.errors && rest.errors[0];
  const checkPath = cellError && cellError.path.split('.').shift() === name;

  const setChanges = (newValue) => {
    if (outsideEditScreen) {
      onChange(newValue);
    } else {
      rest.actions.applyDocumentDiffs(
        diff(dataValue, newValue),
        [rest.stepName].concat(rest.path),
      );
    }
  };

  const handleCellsChange = (changes, additions) =>
    !readOnly &&
    output(
      (val) => {
        const newValue = val.data || val;

        if (diff(dataValue, newValue)) {
          setDataValue([...newValue]);
          setChanges(newValue);
        }
      },
      dataValue,
      items,
    )(changes, additions);

  const handleChange = ({ value, row, propName }) => {
    const newValue = JSON.parse(JSON.stringify(dataValue));

    if (!newValue[row]) {
      newValue[row] = {};
      rest.actions.applyDocumentDiffs(
        diff(dataValue, newValue),
        [rest.stepName].concat(rest.path),
      );
      dataValue[row] = {};
      newValue[row][propName] = value.data || value;
      rest.actions.applyDocumentDiffs(
        diff(dataValue, newValue),
        [rest.stepName].concat(rest.path),
      );
      return;
    }

    newValue[row][propName] = value.data || value;
    setDataValue(newValue);
    setChanges(newValue);
  };

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
        required={required}
        fullWidth={true}
        variant={typography}
        actionButtons={
          <>
            <Button
              onClick={() => setOpen(true)}
              color="inherit"
              startIcon={<FullscreenIcon />}
              classes={{
                label: classes.btnFullScreen,
              }}
              disableRipple
              disableFocusRipple
            >
              {t('ToggleFullscreen')}
            </Button>

            {tableError ? (
              <Typography className={classes.errorMessage}>
                <EJVError error={tableError} />
              </Typography>
            ) : null}
          </>
        }
        {...rest}
      >
        <SpreadsheetErrors
          t={t}
          items={items}
          errors={errors}
          headers={headers}
          setJumpTo={setJumpTo}
        />
        <DataTable
          {...rest}
          name={name}
          items={items}
          headers={headers}
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
          name={name}
          items={items}
          headers={headers}
          height="100%"
          data={data}
          value={dataValue}
          readOnly={readOnly}
          errors={errors}
          onChange={handleChange}
          onCellsChanged={handleCellsChange}
        />
      </FullScreenDialog>
    </>
  );
};

export default DataTableContainer;
