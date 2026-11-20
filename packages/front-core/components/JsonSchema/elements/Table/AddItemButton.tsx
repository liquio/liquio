import React from 'react';
import { Button, Typography } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import AddCircleImage from '@mui/icons-material/AddCircleOutline';
import { Theme } from '@mui/material/styles';

interface AddItemButtonProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  actions?: { addItem?: () => void };
  readOnly?: boolean;
}

const AddItemButton = ({ t, actions = {}, readOnly = false, classes }: AddItemButtonProps) => (
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

const styles = (theme: Theme) => ({
  button: {
    padding: 0,
    marginTop: 5,
    '&:hover': {
      backgroundColor: '#fff',
    },
    ...((theme as unknown as { addItemButton?: object }).addItemButton || {}),
  },
  icon: {
    marginRight: 5,
  },
});

export default withStyles(styles)(AddItemButton);
