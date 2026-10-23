import { makeStyles } from '@mui/styles';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import classNames from 'classnames';
import { ThemeProvider } from '@mui/material/styles';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, useDndContext, DragOverlay, useDndMonitor, useDroppable, type DragEndEvent, type DragStartEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Editable } from './Editable';
import { SortableField } from './SortableField';
import createMuiTheme from 'helpers/createMuiTheme';
import theme from '../theme';
import type { EditorSchema } from '../hooks/useSchema';

const useStyles = makeStyles({
  root: { display: 'flex', flex: 1, flexDirection: 'row', alignItems: 'flex-start', color: '#333', backgroundColor: '#fff', overflowY: 'auto' },
  page: { flex: 1, padding: '10px', backgroundColor: '#fff', borderRadius: '4px', boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)', margin: '0 auto', minHeight: '100%' },
  dragging: { backgroundColor: '#63ccff' },
  itemHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' },
  dragButton: { cursor: 'grab', userSelect: 'none', marginRight: '8px', color: '#ccc' },
  input: { fontSize: 16, color: '#333', border: '1px solid #ccc', padding: 8, borderRadius: 4, flex: 1 },
  button: { background: '#666', color: '#fff', border: 'none', padding: '2px 6px', fontSize: '14px', borderRadius: 3, cursor: 'pointer' },
  cancelButton: { background: '#666', color: '#fff', border: 'none', padding: '2px 6px', fontSize: '14px', borderRadius: 3, cursor: 'pointer' },
});

interface PageControlsProps {
  schema: EditorSchema;
  onChange: (schema: EditorSchema) => void;
  currentPage: string | null;
  setCurrentPage: (page: string | null) => void;
  fullSchema: EditorSchema;
  setSchema: Dispatch<SetStateAction<EditorSchema>>;
}

export const PageControls = ({ schema, onChange, currentPage, setCurrentPage, fullSchema, setSchema }: PageControlsProps) => {
  const classes = useStyles();
  const [propertyList, setPropertyList] = useState<Array<[string, EditorSchema]>>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { measureDroppableContainers } = useDndContext();

  useEffect(() => {
    setPropertyList(Object.entries(schema.properties || {}));
  }, [schema.properties]);

  const { setNodeRef } = useDroppable({ id: 'page-drop-zone' });
  useDndMonitor({
    onDragEnd: (event) => {
      setIsDragging(false);
      if (event.over?.id !== 'page-drop-zone') return;
      const rawData = event.active.data.current?.element?.data;
      let propertyData: EditorSchema = {};
      try {
        const parsed = JSON.parse(String(rawData)) as { code?: string };
        propertyData = JSON.parse(parsed.code || '{}') as EditorSchema;
      } catch {
        if (rawData && typeof rawData === 'object') propertyData = rawData as EditorSchema;
      }
      const newKey = `new-property-${Date.now()}`;
      onChange({ ...schema, properties: { ...schema.properties, [newKey]: propertyData } });
    },
    onDragMove: (event) => setIsDragging(event.over?.id === 'page-drop-zone'),
  });

  const sensors = useSensors(useSensor(PointerSensor));
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
    (measureDroppableContainers as (ids?: UniqueIdentifier[]) => void)();
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = propertyList.findIndex(([key]) => key === active.id);
    const newIndex = propertyList.findIndex(([key]) => key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(propertyList, oldIndex, newIndex);
    setPropertyList(reordered);
    onChange({ ...schema, properties: Object.fromEntries(reordered) });
  };
  const handleChangePageId = (newPageId: string) => {
    const entries = Object.entries(fullSchema.properties || {}).map(([key, page]) => key === currentPage ? [newPageId, page] : [key, page]);
    setSchema({ ...fullSchema, properties: Object.fromEntries(entries) });
    setCurrentPage(newPageId);
  };

  return (
    <div className={classes.root}><div ref={setNodeRef} className={classNames({ [classes.page]: true, [classes.dragging]: isDragging })}>
      <Editable component="span" value={currentPage || ''} onChange={handleChangePageId} style={{ display: 'block', fontSize: '18px', color: '#666', marginBottom: '4px', fontWeight: 'bold', cursor: 'pointer' }} />
      <Editable component="h1" value={typeof schema.description === 'string' ? schema.description : ''} onChange={(description) => onChange({ ...schema, description })} />
      <ThemeProvider theme={createMuiTheme(theme as never)}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          <SortableContext items={propertyList.map(([key]) => key)} strategy={verticalListSortingStrategy}>
            {propertyList.map(([key, value], index) => <SortableField key={key} id={key} value={value} index={index} isSelected={selectedId === key} onClick={setSelectedId} onChange={onChange} schema={schema} setSchema={setSchema} currentPage={currentPage} />)}
          </SortableContext>
          <DragOverlay>{activeId ? <SortableField id={String(activeId)} value={propertyList.find(([key]) => key === activeId)?.[1] || {}} index={-1} /> : null}</DragOverlay>
        </DndContext>
      </ThemeProvider>
    </div></div>
  );
};
