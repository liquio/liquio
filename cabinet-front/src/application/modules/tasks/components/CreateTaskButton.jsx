import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import { history } from 'store';
import classNames from 'classnames';

import { createTask } from 'application/actions/task';

const styles = (theme) => ({
  button: {
    padding: '18px 29px',
    marginTop: 32,
    marginBottom: 36,
    borderRadius: 16,
    marginRight: 24,
    display: 'flex',
    alignSelf: 'flex-start',
    outlineOffset: 2,
    ...(theme?.createBtn || {})
  },
  margin: {
    marginLeft: 24
  },
  addIcon: {
    color: '#fff'
  }
});

const Toolbar = ({ t, classes, isSidebar }) => {
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

const styled = withStyles(styles)(Toolbar);
const translated = translate('Navigator')(styled);

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    createTask: bindActionCreators(createTask, dispatch)
  }
});

Toolbar.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  isSidebar: PropTypes.bool
};

Toolbar.defaultProps = {
  isSidebar: false
};

export default connect(mapStateToProps, mapDispatchToProps)(translated);
