import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';
import formElements from 'components/JsonSchema/elements';
import getFormElementName from 'components/JsonSchema/helpers/getFormElementName';
import type { EditorSchema } from '../hooks/useSchema';

const useStyles = makeStyles({
  item: { padding: 8, borderRadius: '4px', border: '1px solid #fff', marginBottom: '4px', color: '#000', position: 'relative', backgroundColor: '#fff', '&:hover': { border: '1px solid #ccc', color: '#000' } },
  selected: { border: '1px solid #63ccff', '&:hover': { border: '1px solid #63ccff', backgroundColor: '#e6f7ff' }, '& > *': { color: '#000' } },
  dragItem: { border: '1px solid #ccc', '& > *': { color: '#000' } },
  itemHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' },
  dragging: { backgroundColor: '#63ccff', border: '2px dashed #ccc', '& > *': { color: '#000' } },
  labels: { display: 'flex', gap: '4px' },
  deleteIcon: { cursor: 'pointer', color: '#ccc', transition: 'color 0.2s', '&:hover': { color: '#f00' } },
  hiddenLabel: { opacity: 0.5 },
});

interface SortableFieldProps {
  id: string;
  value: EditorSchema;
  index: number;
  isSelected?: boolean;
  onClick?: (id: string) => void;
  onChange?: (schema: EditorSchema) => void;
  schema?: EditorSchema;
  setSchema?: React.Dispatch<React.SetStateAction<EditorSchema>>;
  currentPage?: string | null;
  classes?: unknown;
}

export const SortableField = ({ id, value, index, isSelected = false, onClick = () => {}, onChange, schema = {}, setSchema, currentPage }: SortableFieldProps) => {
  const classes = useStyles();
  const legacyClasses = classes as unknown as Record<string, string>;
  const [isEditing, setIsEditing] = useState(false);
  const [tempId, setTempId] = useState(id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const componentName = getFormElementName(value as { control?: string; type?: string });
  // Read at call time rather than module scope: `formElements` resolves
  // (via a per-app path override) into a module that circularly imports
  // back through this same JsonSchema/editor subtree in at least one app,
  // so evaluating this at module load time can hit it before it's
  // finished initializing.
  const controls = formElements as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;
  const FormControl = componentName ? controls[componentName] || null : null;
  if (!FormControl) console.warn(`No form control found for component: ${componentName}`);

  const renameField = () => {
    const entries = schema.properties
      ? Object.entries(schema.properties).map(([key, field]) => key === id ? [tempId, field] : [key, field])
      : [];
    onChange?.({ ...schema, properties: Object.fromEntries(entries) });
    setIsEditing(false);
  };

  const deleteField = () => {
    if (!setSchema || !currentPage) return;
    const properties = { ...schema.properties };
    delete properties[id];
    const newPage = { ...schema, properties };
    setSchema((previous) => ({ ...previous, properties: { ...previous.properties, [currentPage]: newPage } }));
  };

  return (
    <div ref={setNodeRef} className={classNames(classes.item, { [classes.dragging]: isDragging, [classes.selected]: isSelected, [classes.dragItem]: index === -1 })} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1, zIndex: isDragging ? 1000 : 'auto' }} {...attributes} onClick={() => onClick(id)}>
      <div className={classes.itemHeader}>
        {isEditing ? <>
          <input value={tempId} onChange={(event) => setTempId(event.currentTarget.value)} style={{ flex: 1, background: 'transparent', border: '1px solid #888', color: '#ccc', padding: '2px 4px', fontSize: '14px' }} autoFocus />
          <div style={{ display: 'flex', gap: '4px', marginLeft: 8 }}>
            <button type="button" onClick={renameField} style={{ background: '#666', color: '#fff', border: 'none', padding: '2px 6px', fontSize: 12, borderRadius: 3 }}>✓</button>
            <button type="button" onClick={() => { setTempId(id); setIsEditing(false); }} style={{ background: '#666', color: '#fff', border: 'none', padding: '2px 6px', fontSize: 12, borderRadius: 3 }}>✕</button>
          </div>
        </> : <span {...listeners} style={{ flex: 1, outline: 'none', cursor: 'pointer' }} onDoubleClick={() => setIsEditing(true)}>{id}</span>}
        <div className={classes.labels}>
          {value.hidden ? <span className={legacyClasses.label} style={{ color: 'red' }}>Hidden</span> : null}
          {value.readOnly ? <span className={legacyClasses.label} style={{ color: 'orange' }}>Read Only</span> : null}
          <span className={legacyClasses.label}>{componentName}</span>
          <svg className={classNames(classes.deleteIcon, legacyClasses.label)} onClick={(event) => { event.stopPropagation(); deleteField(); }} xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18"><path d="M0 0h24v24H0z" fill="none" /><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" /></svg>
        </div>
      </div>
      <div id="formControlContainer" className={legacyClasses.formControlContainer}>
        {FormControl ? <FormControl {...value} schema={value} rootDocument={{ data: {} }} steps={[]} /> : <div style={{ color: '#f00', fontSize: '12px' }}>No form control found for component: {componentName}</div>}
      </div>
    </div>
  );
};
