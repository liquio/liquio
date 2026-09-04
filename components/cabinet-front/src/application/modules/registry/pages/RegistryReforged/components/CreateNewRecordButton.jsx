import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { makeStyles } from '@mui/styles';
import { bindActionCreators } from 'redux';
import { Button } from '@mui/material';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import AddIcon from '@mui/icons-material/Add';

const useStyles = makeStyles((theme) => ({
  icon: {
    color: theme.palette.primary.main,
    fill: theme.palette.primary.main
  },
  button: {
    borderColor: theme.palette.primary.main
  }
}));

const CreateNewRecordButton = ({ t, onClick, disabled }) => {
  const classes = useStyles();

  return (
    <Button
      disabled={disabled}
      onClick={onClick}
      startIcon={<AddIcon className={classes.icon} />}
      variant="outlined"
      className={classes.button}
      aria-label={t('AddNewRow')}
    >
      {t('AddNewRow')}
    </Button>
  );
};

CreateNewRecordButton.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch)
  }
});

const translated = translate('RegistryPage')(CreateNewRecordButton);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
