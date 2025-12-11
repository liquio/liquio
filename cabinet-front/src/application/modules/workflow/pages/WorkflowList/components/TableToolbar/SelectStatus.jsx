import React from 'react';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Select, MenuItem, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';

import { loadWorkflowStatuses } from 'application/actions/workflow';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import processList from 'services/processList';

const styles = () => ({
  select: {
    padding: 0,
    '& > .MuiSelect-select': {
      padding: '9.5px 14px'
    }
  },
  disableFocusVisible: {
    outline: 'none !important'
  },
  selectOutlineVisible: {
    '& .MuiSelect-select': {
      outline: 'none !important'
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none !important'
    }
  }
});

const SelectStatus = ({ t, classes, value, filters, onChange, actions }) => {
  const memoizedLoadWorkflowStatuses = React.useMemo(
    () => actions.loadWorkflowStatuses,
    [actions.loadWorkflowStatuses]
  );

  React.useEffect(() => {
    if (filters) return;
    processList.hasOrSet('select-status-init', memoizedLoadWorkflowStatuses);
  }, [memoizedLoadWorkflowStatuses, filters]);

  const options = React.useMemo(
    () => [
      {
        name: 'All',
        value: 0,
        id: 0
      },
      ...(filters || [])
    ],
    [filters]
  );

  const renderValue = React.useCallback(
    (value) => {
      const selected = options.find((option) => option.id === value);

      return (
        <Typography variant="body2">
          <span className="status-label">{t('ByStatus')}</span>
          <Typography variant="subheading2">{t(capitalizeFirstLetter(selected?.name))}</Typography>
        </Typography>
      );
    },
    [t, options]
  );

  const [manual, setManual] = React.useState(false);

  const [selectOutline, setSelectOutline] = React.useState(false);

  return (
    <Select
      value={value}
      onChange={onChange}
      variant="outlined"
      className={classNames({
        [classes.select]: true,
        [classes.selectOutlineVisible]: selectOutline
      })}
      renderValue={renderValue}
      onMouseDown={(e) => {
        e.stopPropagation();
        setManual(true);
        setSelectOutline(true);
      }}
      onBlur={(e) => {
        e.stopPropagation();
        setSelectOutline(false);
      }}
      onClose={() => {
        setManual(false);
      }}
    >
      {options.map((option) => (
        <MenuItem
          key={option.id}
          value={option.id}
          classes={{
            root: classNames({
              [classes.disableFocusVisible]: manual
            })
          }}
        >
          {t(capitalizeFirstLetter(option.name))}
        </MenuItem>
      ))}
    </Select>
  );
};

const mapStateToProps = ({ workflowTemplate }) => ({
  filters: workflowTemplate.statuses
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    loadWorkflowStatuses: bindActionCreators(loadWorkflowStatuses, dispatch)
  }
});

const translated = translate('WorkflowListPage')(SelectStatus);

const styled = withStyles(styles)(translated);

export default connect(mapStateToProps, mapDispatchToProps)(styled);
