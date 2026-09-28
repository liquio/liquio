import React, { useEffect } from 'react';
import { translate } from 'react-translate';
import { Toolbar, Button } from '@mui/material';
import withStyles, { type WithStyles } from '@mui/styles/withStyles';
import { useDraggable } from '@dnd-kit/core';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Icons from 'components/muiIcons';
import EditIcon from 'assets/icons/edit_icon.svg';

const styles = {
  root: { justifyContent: 'flex-start', textAlign: 'left' as const, marginLeft: 5, marginRight: 5, textTransform: 'inherit', fontSize: '14px', lineHeight: '20px', letterSpacing: '0.1px', color: '#CAC4D0', borderRadius: 30, padding: 16, position: 'relative' as const, '&:hover': { '& img': { opacity: 1 }, '& svg': { opacity: 1 } } },
  label: { justifyContent: 'flex-start' },
  icon: { marginRight: 8 },
  editIcon: { position: 'absolute' as const, right: 21, opacity: 0, fill: '#D0BCFF', color: '#D0BCFF', transition: 'opacity 0.25s ease-in-out' },
};

interface SnippetElement { id?: string; type?: string; name: string; data: string }
interface OwnProps {
  element: SnippetElement;
  setActiveSnippet?: (element: SnippetElement) => void;
  setCreateSnippet?: (open: boolean, type?: string) => void;
  search?: string;
  readOnly?: boolean;
  index?: number;
  setDraggingElement?: (id: string) => void;
  visualEditor?: boolean;
}
type Props = OwnProps & WithStyles<typeof styles>;

const iconComponents = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
const getSavedCode = (code: SnippetElement, key: string): unknown => {
  try { return (JSON.parse(code.data) as Record<string, unknown>)[key] || ''; } catch { return ''; }
};

const DraggableElement = ({ classes, element, setActiveSnippet = () => {}, setCreateSnippet = () => {}, search = '', readOnly = false, index = 0, setDraggingElement, visualEditor = false }: Props) => {
  const iconName = String(getSavedCode(element, 'icon') || '');
  const IconComponent = iconName ? iconComponents[iconName] : null;
  const id = element.id || `snippet-${index}`;
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id, data: { type: element.type, index, element } });
  useEffect(() => { if (isDragging) setDraggingElement?.(id); }, [id, isDragging, setDraggingElement]);
  const highlighted = (() => {
    if (!search) return element.name;
    const position = element.name.toLowerCase().indexOf(search.toLowerCase());
    if (position === -1) return element.name;
    return <>{element.name.slice(0, position)}<mark>{element.name.slice(position, position + search.length)}</mark>{element.name.slice(position + search.length)}</>;
  })();

  return (
    <Toolbar disableGutters ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: 1, zIndex: isDragging ? 1000 : 'auto' }}>
      <Button fullWidth classes={{ root: classes.root } as never} onClick={() => { setActiveSnippet(element); setCreateSnippet(true, element.type); }}>
        {IconComponent ? <IconComponent className={classes.icon} /> : null}
        {highlighted}
        {!visualEditor && (readOnly ? <VisibilityIcon className={classes.editIcon} /> : <img src={EditIcon} alt="edit icon" className={classes.editIcon} />)}
      </Button>
    </Toolbar>
  );
};

const StyledDraggableElement = withStyles(styles)(DraggableElement);
export default translate('JsonSchemaEditor')(StyledDraggableElement as never) as unknown as React.ComponentType<OwnProps>;
