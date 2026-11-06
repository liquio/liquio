import React from 'react';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
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

interface StatusOption {
  name: string;
  value: number | string;
  id: number | string;
}

interface SelectStatusProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  value: number | string;
  filters?: StatusOption[];
  onChange: (event: { target: { value: unknown } }) => void;
  actions: { loadWorkflowStatuses: () => void };
}

const SelectStatus = ({ t, classes, value, filters, onChange, actions }: SelectStatusProps) => {
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
    (value: number | string) => {
      const selected = options.find((option) => option.id === value);

      return (
        <Typography variant="body2">
          <span className="status-label">{t('ByStatus')}</span>
          <Typography {...({ variant: 'subheading2' } as unknown as Record<string, unknown>)}>
            {t(capitalizeFirstLetter(selected?.name as string))}
          </Typography>
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
      onChange={onChange as never}
      variant="outlined"
      className={classNames({
        [classes.select]: true,
        [classes.selectOutlineVisible]: selectOutline
      })}
      renderValue={renderValue as never}
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

interface SelectStatusState {
  workflowTemplate: { statuses: StatusOption[] };
}

const mapStateToProps = ({ workflowTemplate }: SelectStatusState) => ({
  filters: workflowTemplate.statuses
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    loadWorkflowStatuses: bindActionCreators(loadWorkflowStatuses, dispatch)
  }
});

const translated = translate('WorkflowListPage')(SelectStatus as never);

const styled = withStyles(styles)(translated as never);

export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
