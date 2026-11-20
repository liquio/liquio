import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import { history } from 'store';
import classNames from 'classnames';

import { createTask } from 'application/actions/task';

type ThemeWithCreateBtn = { createBtn?: Record<string, unknown>; palette: { primary: { contrastText: string } } };

const styles = (theme: ThemeWithCreateBtn) => ({
  button: {
    padding: '18px 29px',
    marginTop: 32,
    marginBottom: 36,
    borderRadius: 16,
    marginRight: 24,
    display: 'flex',
    alignSelf: 'flex-start' as const,
    outlineOffset: 2,
    ...(theme?.createBtn || {})
  },
  margin: {
    marginLeft: 24
  },
  addIcon: {
    color: theme?.palette?.primary?.contrastText
  }
});

interface ToolbarProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  isSidebar?: boolean;
}

const Toolbar = ({ t, classes, isSidebar = false }: ToolbarProps) => {
  const redirectToProcesses = () => history.push('/services');

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={redirectToProcesses}
      startIcon={<AddIcon className={classes.addIcon} />}
      className={classNames({
        [classes.button]: true,
        [classes.margin]: isSidebar
      })}
      aria-label={t('AddNewTask')}
    >
      {t('AddNewTask')}
    </Button>
  );
};

const styled = withStyles(styles)(Toolbar as never);
const translated = translate('Navigator')(styled as never);

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    createTask: bindActionCreators(createTask, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
