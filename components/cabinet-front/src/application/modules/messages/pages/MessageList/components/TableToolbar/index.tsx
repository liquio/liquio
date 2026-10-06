import React from 'react';
import moment from 'moment';
import classNames from 'classnames';
import { Select, MenuItem, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import { translate } from 'react-translate';
import DateRangePickerRaw from './DateRangePicker';

const DateRangePicker = DateRangePickerRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  clearButton: {
    backgroundColor: 'transparent',
    color: theme.palette.primary.main,
    width: '100%',
    '& path': {
      fill: theme.palette.primary.main
    }
  },
  paper: {
    padding: 12
  },
  filterItem: {
    marginBottom: 24
  },
  select: {
    padding: 0
  },
  disableFocusVisible: {
    outline: 'none !important'
  }
});

interface Filters {
  is_read?: number;
  from_created_at?: string;
  to_created_at?: string;
  [key: string]: unknown;
}

interface TableToolsProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  actions: { onFilterChange: (filters: Filters) => void };
  filters: Filters;
}

const TableTools = ({ t, classes, actions, filters }: TableToolsProps) => {
  const [manual, setManual] = React.useState(false);

  const memoizedOnFilterChange = React.useMemo(
    () => actions.onFilterChange,
    [actions.onFilterChange]
  );

  const onChange = React.useCallback(
    ({ target: { value } }: { target: { value: number } }) => {
      memoizedOnFilterChange({
        ...filters,
        is_read: value === 1 ? undefined : value
      });
    },
    [memoizedOnFilterChange, filters]
  );

  const onDateChange = React.useCallback(
    ({ startDate, endDate }: { startDate?: unknown; endDate?: unknown }) => {
      const newDates: Filters = {
        ...filters
      };

      if (startDate) {
        newDates.from_created_at =
          typeof startDate === 'string'
            ? startDate
            : moment((startDate as moment.Moment).toDate()).format('YYYY-MM-DD');
      }

      if (endDate) {
        newDates.to_created_at =
          typeof endDate === 'string' ? endDate : moment((endDate as moment.Moment).toDate()).format('YYYY-MM-DD');
      }

      memoizedOnFilterChange(newDates);
    },
    [memoizedOnFilterChange, filters]
  );

  const handleClear = React.useCallback(() => {
    memoizedOnFilterChange({
      ...filters,
      from_created_at: undefined,
      to_created_at: undefined
    });
  }, [memoizedOnFilterChange, filters]);

  const options = React.useMemo(
    () => [
      {
        label: t('All'),
        value: 1,
        id: 1
      },
      {
        label: t('UnreadOnly'),
        value: 0,
        id: 1
      }
    ],
    [t]
  );

  const value = React.useMemo(() => (filters.is_read !== 0 ? 1 : 0), [filters.is_read]);

  const renderValue = React.useCallback(() => {
    const index = value === 0 ? 1 : 0;

    return (
      <Typography variant="body2">
        <span className="status-label">{t('ByStatus')}</span>
        {/* `subheading2` isn't a real MUI variant — preserved as-is, not corrected. */}
        <Typography {...({ variant: 'subheading2' } as unknown as Record<string, unknown>)}>
          {options[index].label}
        </Typography>
      </Typography>
    );
  }, [t, value, options]);

  return (
    <>
      <Select
        value={value}
        onMouseDown={(e) => {
          e.stopPropagation();
          setManual(true);
        }}
        onClose={() => setManual(false)}
        onChange={onChange as never}
        variant="outlined"
        classes={{
          select: classes.select
        }}
        renderValue={renderValue}
      >
        {options.map(({ label, value, id }) => (
          <MenuItem
            value={value}
            key={id}
            classes={{
              root: classNames({
                [classes.disableFocusVisible]: manual
              })
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Select>

      <DateRangePicker
        t={t}
        classes={classes}
        startDate={filters?.from_created_at}
        endDate={filters?.to_created_at}
        onDateChange={onDateChange}
        handleClear={handleClear}
      />
    </>
  );
};

const styled = withStyles(styles)(TableTools as never);

export default translate('MessageListPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
