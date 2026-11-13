import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { makeStyles } from '@mui/styles';
import { bindActionCreators, Dispatch } from 'redux';
import { Button } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import AddIcon from '@mui/icons-material/Add';

const useStyles = makeStyles((theme: Theme) => ({
  icon: {
    color: theme.palette.primary.main,
    fill: theme.palette.primary.main
  },
  button: {
    borderColor: theme.palette.primary.main
  }
}));

interface CreateNewRecordButtonProps {
  t: (key: string) => string;
  onClick?: () => void;
  disabled?: boolean;
}

const CreateNewRecordButton = ({ t, onClick, disabled }: CreateNewRecordButtonProps) => {
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

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch)
  }
});

const translated = translate('RegistryPage')(CreateNewRecordButton as never);

export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
