import React from 'react';
import moment from 'moment';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';

import DateRangePickerRaw from 'modules/messages/pages/MessageList/components/TableToolbar/DateRangePicker';

const DateRangePicker = DateRangePickerRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: { palette: { primary: { main: string } } }) => ({
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
  },
  mobileBtn: {
    minWidth: '40px',
    '& span': {
      margin: 0
    }
  }
});

interface TableToolsProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  actions: { onFilterChange: (filters: Record<string, unknown>) => void };
  filters: { from_created_at?: string; to_created_at?: string; [key: string]: unknown };
}

const TableTools = ({ t, classes, actions, filters }: TableToolsProps) => {
  const memoizedOnFilterChange = React.useMemo(
    () => actions.onFilterChange,
    [actions.onFilterChange]
  );

  const onDateChange = React.useCallback(
    ({ startDate, endDate }: { startDate?: unknown; endDate?: unknown }) => {
      const newDates = {
        ...filters
      };

      if (startDate) {
        newDates.from_created_at =
          typeof startDate === 'string'
            ? startDate
            : moment((startDate as { toDate: () => Date }).toDate()).format('YYYY-MM-DD');
      }

      if (endDate) {
        newDates.to_created_at =
          typeof endDate === 'string' ? endDate : moment((endDate as { toDate: () => Date }).toDate()).format('YYYY-MM-DD');
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

  return (
    <>
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
