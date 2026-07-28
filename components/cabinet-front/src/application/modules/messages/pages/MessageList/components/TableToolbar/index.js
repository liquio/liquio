import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import classNames from 'classnames';
import { Select, MenuItem, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import { translate } from 'react-translate';
import DateRangePicker from './DateRangePicker';

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
  }
});

const TableTools = ({ t, classes, actions, filters }) => {
  const [manual, setManual] = React.useState(false);

  const memoizedOnFilterChange = React.useMemo(
    () => actions.onFilterChange,
    [actions.onFilterChange]
  );

  const onChange = React.useCallback(
    ({ target: { value } }) => {
      memoizedOnFilterChange({
        ...filters,
        is_read: value === 1 ? undefined : value
      });
    },
    [memoizedOnFilterChange, filters]
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
        <Typography variant="subheading2">{options[index].label}</Typography>
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
        onChange={onChange}
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

TableTools.propTypes = {
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  filters: PropTypes.object.isRequired
};

const styled = withStyles(styles)(TableTools);

export default translate('MessageListPage')(styled);
