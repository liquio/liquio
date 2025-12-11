/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { Tooltip } from '@mui/material';
import { DynamicDataSheetGrid, textColumn } from 'react-datasheet-grid';
import makeStyles from '@mui/styles/makeStyles';
import 'react-datasheet-grid/dist/style.css';
import useHeaders from './helpers/useHeaders';
import useTooltip from './helpers/useTooltip';
import selectColumn from './components/CustomSelectCell';
import maskColumn from './components/MaskedCell';
import registerColumn from './components/RegisterColumn';
import TextColumnUse from './components/TextCell';
import NumberColumnUse from './components/NumberCell';
import arrowTable from 'assets/img/arrowTable.svg';
import theme from 'theme';

const getFont = () => {
  try {
    return theme?.typography?.fontFamily;
  } catch {
    return 'Roboto';
  }
};

const styles = {
  errorCell: {
    backgroundColor: '#E27D7D !important',
  },
  errorCellDefault: {
    color: '#BA0009 !important',
    border: '2px solid #BA0009 !important',
    borderTop: 'none !important',
    '&.dsg-cell .MuiInputBase-input': {
      color: '#BA0009!important',
    },
  },
  firstErrorCellDefault: {
    color: '#BA0009 !important',
    border: '2px solid #BA0009 !important',
    borderTop: '3px solid #BA0009 !important',
    '&.dsg-cell .MuiInputBase-input': {
      color: '#BA0009!important',
    },
  },
  lastErrorCellDefault: {
    color: '#BA0009 !important',
    border: '2px solid #BA0009 !important',
    borderBottom: '3px solid #BA0009 !important',
    borderTop: 'none !important',
    '&.dsg-cell .MuiInputBase-input': {
      color: '#BA0009!important',
    },
  },
  errorRow: {
    backgroundColor: '#F5E1E1 !important',
  },
  cursor: {
    '& div': {
      cursor: 'inherit !important',
    },
  },
  defaultLayout: {
    '& .dsg-row-header .dsg-cell': {
      backgroundColor: '#E7EEF3',
    },
    '& .dsg-row-header .dsg-cell-gutter': {
      backgroundColor: '#fff',
      boxShadow: 'none',
    },
    '& .dsg-cell-header-container': {
      color: '#444444',
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 500,
    },
    '& .dsg-cell, & .dsg-scrollable-view': {
      border: '1px solid #E7EEF3',
    },
    '& .dsg-container': {
      borderTop: '1px solid #E7EEF3',
      borderLeft: '1px solid #E7EEF3',
    },
    '& .dsg-corner-indicator': {
      borderBottom: 'none',
      borderLeft: 'none',
      backgroundImage: `url(${arrowTable})`,
      width: '24px',
      height: '24px',
    },
    '& .dsg-cell': {
      color: '#444444',
      fontFamily: `${getFont()}`,
      fontSize: '12px',
      lineHeight: '16px',
      textAlign: 'center',
      '& .MuiInputBase-input': {
        color: '#000000',
        fontFamily: `${getFont()}`,
        fontSize: '13px',
        lineHeight: '18px',
      },
    },
    '& .dsg-context-menu': {
      padding: '8px 0',
      '&-item': {
        fontSize: 13,
        lineHeight: '18px',
        letterSpacing: '-0.02em',
        color: '#000000',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer !important',
        '&:hover': {
          backgroundColor: '#F1F1F1',
        },
        '&:empty': {
          display: 'none',
        },
      },
    },
  },
};

const useStyles = makeStyles(styles);

const DataSheetGridHeaded = ({
  headers,
  columns,
  errors,
  setActiveCellRef,
  isMobile,
  props: propsOrigin,
  onImportCallback,
  ...props
}) => {
  const ref = React.useRef(null);
  const [rows, setRows] = React.useState([]);
  const className = useHeaders(headers);
  const tooltipProps = useTooltip(className);
  const classes = useStyles();

  const mapColumns = React.useMemo(() => {
    return (columns || []).map((column) => {
      if (column.options) {
        return {
          ...textColumn,
          ...selectColumn({
            ...column,
          }),
        };
      }

      if (column.mask) {
        return {
          ...textColumn,
          ...maskColumn({
            ...column,
            setActiveCellRef
          }),
        };
      }

      if (column.control === 'register') {
        return {
          ...textColumn,
          ...registerColumn({
            ...column,
            propsOrigin,
            setActiveCellRef,
            onImportCallback
          }),
        };
      }

      if (column.type === 'number') {
        return {
          ...textColumn,
          ...NumberColumnUse({
            ...column,
            setActiveCellRef
          }),
        };
      }

      return {
        ...textColumn,
        ...TextColumnUse({
          ...column,
          setActiveCellRef,
        }),
      };
    });
  }, [columns, setActiveCellRef, propsOrigin, onImportCallback]);

  React.useEffect(() => {
    if (
      ref.current &&
      setActiveCellRef &&
      isMobile &&
      props.value.length > rows.length
    ) {
      setActiveCellRef({
        root: ref.current,
      });
      setRows(props.value);
    }
  }, [ref, setActiveCellRef, isMobile, props.value, rows]);

  const { defaultLayout } = theme;

  return (
    <>
      <Tooltip {...tooltipProps} placement="top" arrow>
        <span />
      </Tooltip>
      <DynamicDataSheetGrid
        {...props}
        ref={ref}
        columns={mapColumns}
        className={`${className} ${classes.cursor} ${
          defaultLayout && classes.defaultLayout
        }`}
        cellClassName={({ rowIndex, columnId }) => {
          if (!errors || !errors.length) return null;

          const rowErrors = errors.filter(({ rowId }) => rowId === rowIndex);

          const error = rowErrors.find(
            ({ path }) => (path || '').indexOf(columnId) !== -1,
          );

          if (rowErrors.length && !error && !defaultLayout) {
            return classes.errorRow;
          }

          if ((error?.path || '').indexOf(columnId) !== -1) {
            if (rowIndex === 0 && defaultLayout)
              return classes.firstErrorCellDefault;
            if (rowIndex === props.value.length - 1 && defaultLayout)
              return classes.lastErrorCellDefault;
            return defaultLayout ? classes.errorCellDefault : classes.errorCell;
          }

          return null;
        }}
      />
    </>
  );
};

export default DataSheetGridHeaded;
