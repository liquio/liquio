import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import type { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import { PageListItem } from './PageListItem';
import { AddPageListItem } from './AddPageListItem';
import type { EditorSchema } from '../hooks/useSchema';

const useStyles = makeStyles<Theme>((theme) => ({
  root: { width: '100%', minHeight: 216, overflowX: 'auto', boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)' },
  listWrapper: { display: 'flex', flexDirection: 'row', padding: theme.spacing(1), gap: theme.spacing(1), width: 'max-content', margin: '0 auto' },
}));

interface PageListProps {
  schema: EditorSchema;
  onChange: (schema: EditorSchema) => void;
  currentPage: string | null;
  setCurrentPage: (page: string | null) => void;
}

export const PageList = ({ schema, onChange, currentPage, setCurrentPage }: PageListProps) => {
  const classes = useStyles();
  const items = Object.keys(schema.properties || {}).map((id) => ({ id, title: typeof schema.properties?.[id]?.description === 'string' ? schema.properties[id].description as string : id, properties: schema.properties?.[id] || {} }));
  const handleDeletePage = (id: string) => {
    const rest = { ...schema.properties };
    delete rest[id];
    onChange({ ...schema, properties: rest });
    if (currentPage === id) setCurrentPage(Object.keys(rest)[0] || null);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reordered = Array.from(items);
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, items[oldIndex]);
    const properties = reordered.reduce<Record<string, EditorSchema>>((result, item) => { result[item.id] = item.properties; return result; }, {});
    onChange({ ...schema, properties });
    setCurrentPage(reordered[newIndex].id);
  };
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return (
    <div className={classes.root}><div className={classes.listWrapper}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToHorizontalAxis]}>
        <SortableContext items={items} strategy={horizontalListSortingStrategy}>
          {items.map((page) => <PageListItem key={page.id} id={page.id} page={page} isSelected={currentPage === page.id} onClick={() => setCurrentPage(page.id)} onDelete={handleDeletePage} />)}
        </SortableContext>
        <AddPageListItem schema={schema} onChange={onChange} setCurrentPage={setCurrentPage} />
      </DndContext>
    </div></div>
  );
};
