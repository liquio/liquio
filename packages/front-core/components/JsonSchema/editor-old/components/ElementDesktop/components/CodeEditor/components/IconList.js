import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import StringElement from 'components/JsonSchema/elements/StringElement';
import Icons from './muiIcons';

const useStyles = makeStyles({
  actionsWrapper: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    marginTop: 20,
    width: '100%',
    padding: 10,
    borderRadius: '4px 4px 0px 0px',
    backgroundColor: '#2e2e2e',
  },
  button: {
    marginRight: 20,
  },
  searchInput: {
    marginBottom: 10,
  },
  chosenIcon: {
    marginLeft: 10,
  },
});

const IconListDialog = ({ t, chosenIcon: chosenIconOrigin, handleChoose }) => {
  const [chosenIcon, setChosenIcon] = useState(chosenIconOrigin || null);
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const classes = useStyles();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const chooseIcon = (icon) => {
    setChosenIcon(icon);
    handleChoose(icon);
    handleClose();
  };

  const IconComponent = chosenIcon ? Icons[chosenIcon] : null;

  const filteredIcons = Object.keys(Icons).filter((icon) => {
    return icon.toLowerCase().includes(searchInput.toLowerCase());
  });

  return (
    <>
      <div className={classes.actionsWrapper}>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={handleClickOpen}
        >
          {t('ChooseIcon')}
        </Button>
        {chosenIcon ? (
          <>
            <IconComponent />
            <Typography className={classes.chosenIcon}>{chosenIcon}</Typography>
          </>
        ) : (
          <Typography>{t('ChooseIconDescription')}</Typography>
        )}
      </div>

      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <StringElement
            description={t('SearchIconDescription')}
            fullWidth={true}
            darkTheme={true}
            required={true}
            variant={'outlined'}
            inputProps={{ maxLength: 255 }}
            autoFocus={true}
            onChange={(value) => setSearchInput(value)}
            value={searchInput}
          />
          <List>
            {filteredIcons.map((IconComponent) => {
              const Icon = Icons[IconComponent];

              return (
                <ListItem
                  key={IconComponent}
                  button={true}
                  onClick={() => chooseIcon(IconComponent)}
                >
                  <ListItemIcon>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText primary={IconComponent} />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IconListDialog;
