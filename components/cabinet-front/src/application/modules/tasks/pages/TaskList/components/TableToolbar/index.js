import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';

import DateRangePicker from 'modules/messages/pages/MessageList/components/TableToolbar/DateRangePicker';

const styles = (theme) => ({
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

const TableTools = ({ t, classes, actions, filters }) => {
  const memoizedOnFilterChange = React.useMemo(
    () => actions.onFilterChange,
    [actions.onFilterChange]
  );

  const onDateChange = React.useCallback(
    ({ startDate, endDate }) => {
      const newDates = {
        ...filters
      };

      if (startDate) {
        newDates.from_created_at =
          typeof startDate === 'string'
            ? startDate
            : moment(startDate.toDate()).format('YYYY-MM-DD');
      }

      if (endDate) {
        newDates.to_created_at =
          typeof endDate === 'string' ? endDate : moment(endDate.toDate()).format('YYYY-MM-DD');
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

TableTools.propTypes = {
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  filters: PropTypes.object.isRequired
};

const styled = withStyles(styles)(TableTools);

export default translate('MessageListPage')(styled);
