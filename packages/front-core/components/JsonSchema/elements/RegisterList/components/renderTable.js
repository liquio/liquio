import React from 'react';
import classNames from 'classnames';
import _ from 'lodash';
import { useTranslate } from 'react-translate';
import { makeStyles } from '@mui/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { IconButton, InputAdornment } from '@mui/material';
import { Clear } from '@mui/icons-material';
import TextBlock from 'components/JsonSchema/elements/TextBlock';
import StringElement from 'components/JsonSchema/elements/StringElement';
import evaluate from 'helpers/evaluate';
import RenderOneLine from 'helpers/renderOneLine';

const useStyles = makeStyles((theme) => ({
  contentWrapper: {
    width: '100%',
    overflow: 'hidden',
    marginBottom: 30,
  },
  cellRoot: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: '16px',
    padding: '16px 8px',
    borderBottom: '1px solid #00000080',
  },
  cellHeader: {
    borderBottom: 'none',
  },
  searchField: {
    marginTop: 10,
    '& input': {
      fontSize: 12,
      fontStyle: 'normal',
      fontWeight: 400,
      lineHeight: '16px',
    },
  },
  iconButton: {
    padding: 1,
  },
  rowCount: {
    padding: '15px 10px',
    fontWeight: 700,
    fontSize: '16px',
    lineHeight: '24px',
    borderTop: '1px solid #e0e0e0',
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
}));

const TableComponent = ({
  data,
  columns,
  maxHeight,
  onFilterChange,
  requestFilters,
  onRowClick,
  count,
  showCount,
  setOffset,
}) => {
  const timeoutRef = React.useRef(null);
  const t = useTranslate('Elements');
  const classes = useStyles();

  const handleSearch = React.useCallback(
    (id, value) => {
      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        setOffset(0);
        onFilterChange({
          ...requestFilters,
          [id]: value,
        });
      }, 1000);
    },
    [onFilterChange, requestFilters, setOffset],
  );

  const handleClear = React.useCallback(
    (id) => {
      onFilterChange({
        ...requestFilters,
        [id]: '',
      });
    },
    [onFilterChange, requestFilters],
  );

  const RenderCell = React.useCallback(
    ({ column, header, children, filter }) => {
      const filterValue = requestFilters[column?.id] || '';
      const id = column?.id;

      return (
        <TableCell
          align={column?.align}
          classes={{
            root: classNames({
              [classes.cellRoot]: true,
              [classes.cellHeader]: header,
            }),
          }}
          style={{ minWidth: column?.minWidth }}
        >
          {children}
          {filter ? (
            <StringElement
              value={requestFilters[id]}
              noMargin={true}
              required={true}
              autoFocus={requestFilters[id]}
              path={[id, _.uniqueId()]}
              variant={'standard'}
              placeholder={t('Search')}
              className={classes.searchField}
              onChange={(value) => handleSearch(id, value)}
              endAdornment={
                <InputAdornment position="end">
                  {filterValue ? (
                    <IconButton
                      className={classes.iconButton}
                      onClick={() => handleClear(id)}
                    >
                      <Clear />
                    </IconButton>
                  ) : null}
                </InputAdornment>
              }
            />
          ) : null}
        </TableCell>
      );
    },
    [classes, t, handleSearch, requestFilters, handleClear],
  );

  const onRowClickWrapper = React.useCallback(
    (row) => {
      if (!onRowClick) return;

      const evaluateValue = evaluate(onRowClick, row);

      if (evaluateValue instanceof Error) return;

      window.location.href = evaluateValue;
    },
    [onRowClick],
  );

  if (!data || !columns) {
    return null;
  }

  return (
    <div className={classes.contentWrapper}>
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <RenderCell
                  key={column?.id}
                  column={column}
                  header={true}
                  filter={column?.filter}
                >
                  <RenderOneLine title={column?.label} allowMobile={true} />
                </RenderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              return (
                <TableRow
                  hover
                  tabIndex={-1}
                  key={row.code}
                  onClick={() => onRowClickWrapper(row)}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                >
                  {columns.map((column) => {
                    const { id, render, htmlBlock } = column;

                    const value = row[id];

                    if (htmlBlock) {
                      return (
                        <RenderCell key={column?.id} column={column}>
                          <TextBlock
                            htmlBlock={htmlBlock}
                            params={{
                              [id]: id,
                            }}
                            parentValue={row}
                            rootDocument={{ data: row }}
                            pure={true}
                          />
                        </RenderCell>
                      );
                    }

                    if (render) {
                      const renderValue = evaluate(render, row) || value;

                      return (
                        <RenderCell key={column?.id} column={column}>
                          {renderValue}
                        </RenderCell>
                      );
                    }

                    return (
                      <RenderCell key={column?.id} column={column}>
                        {value}
                      </RenderCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {showCount && (
        <div className={classes.rowCount}>
          {' '}
          {t('total')} {count}{' '}
        </div>
      )}
    </div>
  );
};

export default TableComponent;
