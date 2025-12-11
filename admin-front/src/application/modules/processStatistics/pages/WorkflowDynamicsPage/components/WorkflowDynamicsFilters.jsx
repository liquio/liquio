import React from 'react';
import { Toolbar } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import DuringThisPeriodSelect from './DuringThisPeriodSelect';
import UntilThisMomentSelect from './UntilThisMomentSelect';
import TypeSelect from './TypeSelect';

const styles = () => ({
  toolbar: {
    marginTop: 5,
    padding: 12,
  },
});

const useStyles = makeStyles(styles);

const WorkflowDynamicsFilters = ({ filters, setFilters, type, setType }) => {
  const classes = useStyles();

  return (
    <Toolbar className={classes.toolbar}>
      <DuringThisPeriodSelect
        value={filters.duringThisPeriod}
        onChange={(duringThisPeriod) =>
          setFilters({ ...filters, duringThisPeriod })
        }
      />
      <UntilThisMomentSelect
        value={filters.untilThisMoment}
        period={filters.duringThisPeriod}
        onChange={(untilThisMoment) =>
          setFilters({ ...filters, untilThisMoment })
        }
      />
      <TypeSelect value={type} onChange={setType} />
    </Toolbar>
  );
};

export default WorkflowDynamicsFilters;
