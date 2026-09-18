import React from 'react';
import { makeStyles } from '@mui/styles';
import type { Theme } from '@mui/material/styles';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ProgressLine from 'components/Preloader/ProgressLine';

const useStyles = makeStyles<Theme>((theme) => ({
  dialogTitle: { '& > h2': { marginTop: 20, fontWeight: 400, fontSize: 32, lineHeight: '38px', letterSpacing: '-0.02em', marginBottom: 20, color: '#fff' } },
  paper: { backgroundColor: '#404040', borderRadius: 2, minWidth: 688, [theme.breakpoints.down('md')]: { minWidth: '100%' } },
  saveAction: { backgroundColor: '#BB86FC', color: '#000000', marginLeft: 15, '&:hover': { backgroundColor: '#BB86FC', color: '#000000' } },
  closeAction: { color: '#BB86FC' },
  dialogAction: { justifyContent: 'space-between', paddingLeft: 12, paddingRight: 25, paddingBottom: 40 },
  icon: { marginRight: 10, fill: '#BB86FC' },
  progressLineWrapper: { marginTop: 20 },
}));

interface Group { name: string }
interface CreateGroupProps {
  t: (key: string) => string;
  open: boolean;
  handleClose: () => void;
  handleCreateGroup: (group: Group) => void;
  handleDeleteGroup: () => void;
  activeGroup?: Group | null;
  loading?: boolean;
  readOnly?: boolean;
  groups: Group[];
}

const CreateGroup = ({ t, open, handleClose, handleCreateGroup, handleDeleteGroup, activeGroup, loading, readOnly, groups }: CreateGroupProps) => {
  const classes = useStyles();
  const [groupName, setGroupName] = React.useState(activeGroup?.name || '');
  const [error, setError] = React.useState<string | false>(false);
  const handleSave = () => {
    if (!groupName) return setError(t('RequiredField'));
    if (groups.some((group) => group.name === groupName)) return setError(t('GroupNameAlreadyExist'));
    handleCreateGroup({ name: groupName });
  };

  return (
    <Dialog open={open} scroll="body" fullWidth={true} onClose={handleClose} classes={{ paper: classes.paper }}>
      <DialogTitle classes={{ root: classes.dialogTitle }}>{t('CreateCroupTitle')}</DialogTitle>
      <DialogContent><DialogContentText>
        <StringElement description={t('GroupName')} fullWidth={true} darkTheme={true} required={true} variant="outlined" inputProps={{ maxLength: 255 }} autoFocus={true} onChange={(value: unknown) => setGroupName(String(value ?? ''))} value={groupName} error={error ? { keyword: '', message: error } : null} />
        <ProgressLine loading={loading} classes={classes.progressLineWrapper as never} />
      </DialogContentText></DialogContent>
      <DialogActions classes={{ root: classes.dialogAction }}>
        {activeGroup && !readOnly ? <Button classes={{ root: classes.closeAction }} onClick={handleDeleteGroup}><DeleteOutlineOutlinedIcon className={classes.icon} />{t('Delete')}</Button> : <div />}
        <div>
          <Button onClick={handleClose} classes={{ root: classes.closeAction }}>{t('Close')}</Button>
          {readOnly ? <div /> : <Button variant="contained" color="primary" classes={{ root: classes.saveAction }} onClick={handleSave}>{t('Save')}</Button>}
        </div>
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroup;
