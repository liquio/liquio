import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import moment from 'moment';
import { Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

const styles = {
  root: {
    marginBottom: 30,
    marginTop: 20
  }
};

const HandleTask = ({ t, classes, busy, meta, onHandleTask, onCancelHandlingTask }) => (
  <div className={classes.root}>
    {!meta.handling || !Object.keys(meta?.handling).length ? (
      <Button variant="contained" color="primary" disabled={busy} onClick={onHandleTask}>
        {t('HandleTask')}
      </Button>
    ) : (
      <>
        <Typography variant="body1">
          {t('HandlingDescription', {
            time: moment(meta?.handling?.timestamp).format('DD.MM.YYYY HH:mm'),
            user: meta?.handling?.userName
          })}
        </Typography>
        <Button onClick={onCancelHandlingTask} disabled={busy} variant="outlined" sx={{ mt: 2 }}>
          {t('CancelHandling')}
        </Button>
      </>
    )}
  </div>
);

HandleTask.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  onHandleTask: PropTypes.func,
  onCancelHandlingTask: PropTypes.func,
  busy: PropTypes.bool.isRequired,
  meta: PropTypes.object.isRequired.isRequired
};

HandleTask.defaultProps = {
  onHandleTask: () => null,
  onCancelHandlingTask: () => null
};

const mapStateToProps = ({ auth: { info } }) => ({ user: info });

const styled = withStyles(styles)(HandleTask);
const translated = translate('TaskPage')(styled);
export default connect(mapStateToProps)(translated);
