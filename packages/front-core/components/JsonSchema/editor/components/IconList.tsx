import React, { useState } from 'react';
import { Button, Dialog, DialogContent, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import StringElement from 'components/JsonSchema/elements/StringElement';
import Icons from 'components/muiIcons';

const useStyles = makeStyles({
  actionsWrapper: { display: 'flex', alignItems: 'center', marginBottom: '10px', marginTop: 20, width: '100%', padding: 10, borderRadius: '4px 4px 0px 0px', backgroundColor: '#2e2e2e' },
  button: { marginRight: 20 },
  searchInput: { marginBottom: 10 },
  chosenIcon: { marginLeft: 10 },
});

interface IconListDialogProps {
  t: (key: string) => string;
  chosenIcon?: string;
  handleChoose: (icon: string) => void;
}

const iconComponents = Icons as unknown as Record<string, React.ComponentType>;

const IconListDialog = ({ t, chosenIcon: initialIcon, handleChoose }: IconListDialogProps) => {
  const [chosenIcon, setChosenIcon] = useState<string | null>(initialIcon || null);
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const classes = useStyles();
  const ChosenIcon = chosenIcon ? iconComponents[chosenIcon] : null;
  const filteredIcons = Object.keys(iconComponents).filter((icon) => icon.toLowerCase().includes(searchInput.toLowerCase()));
  const chooseIcon = (icon: string) => {
    setChosenIcon(icon);
    handleChoose(icon);
    setOpen(false);
  };

  return (
    <>
      <div className={classes.actionsWrapper}>
        <Button variant="contained" color="primary" className={classes.button} onClick={() => setOpen(true)}>{t('ChooseIcon')}</Button>
        {chosenIcon && ChosenIcon ? <><ChosenIcon /><Typography className={classes.chosenIcon}>{chosenIcon}</Typography></> : <Typography>{t('ChooseIconDescription')}</Typography>}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent>
          <StringElement description={t('SearchIconDescription')} fullWidth={true} darkTheme={true} required={true} variant="outlined" inputProps={{ maxLength: 255 }} autoFocus={true} onChange={(nextValue: unknown) => setSearchInput(String(nextValue ?? ''))} value={searchInput} />
          <List>
            {filteredIcons.map((iconName) => {
              const Icon = iconComponents[iconName];
              return <ListItemButton key={iconName} onClick={() => chooseIcon(iconName)}><ListItemIcon><Icon /></ListItemIcon><ListItemText primary={iconName} /></ListItemButton>;
            })}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IconListDialog;
