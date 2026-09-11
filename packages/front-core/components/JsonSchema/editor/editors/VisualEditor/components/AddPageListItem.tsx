import { Button } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import AddIcon from '@mui/icons-material/Add';
import type { EditorSchema } from '../hooks/useSchema';

const useStyles = makeStyles<Theme>((theme) => ({
  listItem: { padding: theme.spacing(1), backgroundColor: theme.palette.background.paper, color: theme.palette.text.secondary, borderRadius: theme.shape.borderRadius, boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '170px', minWidth: '170px', height: '200px', overflow: 'hidden', textAlign: 'center', wordWrap: 'break-word', whiteSpace: 'normal' },
  dragging: { boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)', transform: 'scale(1.05)', zIndex: 1000 },
  active: { backgroundColor: theme.palette.primary.light, color: theme.palette.primary.contrastText },
  dragButton: { cursor: 'pointer', userSelect: 'none', marginTop: 10 },
  title: { fontWeight: 'bold', marginBottom: theme.spacing(0.5) },
  description: { fontSize: '0.875rem', color: theme.palette.text.secondary, flexGrow: 1 },
}));

interface AddPageListItemProps {
  schema: EditorSchema;
  onChange: (schema: EditorSchema) => void;
  setCurrentPage: (page: string) => void;
}

export const AddPageListItem = ({ schema, onChange, setCurrentPage }: AddPageListItemProps) => {
  const classes = useStyles();
  const handleClick = () => {
    const newPageId = `page-${Date.now()}`;
    onChange({ ...schema, properties: { ...schema.properties, [newPageId]: { type: 'object', properties: {}, description: 'New Page' } } });
    setCurrentPage(newPageId);
  };
  return (
    <div className={classes.listItem}>
      <div><div className={classes.title}>Add New Page</div><div className={classes.description}>Click to add a new page</div></div>
      <Button color="primary" variant="contained" className={classes.dragButton} onClick={handleClick} aria-label="Add Page" size="large"><AddIcon /></Button>
    </div>
  );
};
