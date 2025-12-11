import React from 'react';
import PropTypes from 'prop-types';
import { Button, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddCircleImage from '@mui/icons-material/AddCircleOutline';

const AddItemButton = ({ t, actions, readOnly, classes }) => (
  <Button
    onClick={actions.addItem}
    disabled={readOnly}
    className={classes.button}
    aria-label={t('AddNewRow')}
  >
    <AddCircleImage className={classes.icon} />
    <Typography>{t('AddNewRow')}</Typography>
  </Button>
);

const styles = (theme) => ({
  button: {
    padding: 0,
    marginTop: 5,
    '&:hover': {
      backgroundColor: '#fff',
    },
    ...(theme.addItemButton || {}),
  },
  icon: {
    marginRight: 5,
  },
});

AddItemButton.propTypes = {
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object,
  readOnly: PropTypes.bool,
};

AddItemButton.defaultProps = {
  actions: {},
  readOnly: false,
};

export default withStyles(styles)(AddItemButton);
