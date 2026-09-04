import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import {
  restrictToHorizontalAxis,
} from '@dnd-kit/modifiers';

import { PageListItem } from './PageListItem';
import { makeStyles } from '@mui/styles';
import { AddPageListItem } from './AddPageListItem';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    minHeight: 216,
    overflowX: 'auto',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
  },
  listWrapper: {
    display: 'flex',
    flexDirection: 'row',
    padding: theme.spacing(1),
    gap: theme.spacing(1),
    width: 'max-content',
    margin: '0 auto',
  },
}));

export const PageList = ({ schema, onChange, currentPage, setCurrentPage }) => {
  const classes = useStyles();

  const items = Object.keys(schema.properties || {}).map((key) => ({
    id: key,
    title: schema.properties[key].description || key,
    properties: schema.properties[key],
  }));

  const handleDeletePage = (idToDelete) => {
    const rest = { ...schema.properties };
    delete rest[idToDelete];
    const newSchema = {
      ...schema,
      properties: rest,
    };

    onChange(newSchema);

    if (currentPage === idToDelete) {
      const remainingPages = Object.keys(rest);
      setCurrentPage(remainingPages[0] || null);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);
    const newItems = Array.from(items);
    newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, items[oldIndex]);
    const newSchema = {
      ...schema,
      properties: newItems.reduce((acc, item) => {
        acc[item.id] = item.properties;
        return acc;
      }, {}),
    };
    onChange(newSchema);
    setCurrentPage(newItems[newIndex].id);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className={classes.root}>
      <div className={classes.listWrapper}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis]}
        >
          <SortableContext
            items={items}
            strategy={horizontalListSortingStrategy}
          >
            {items.map(page => <PageListItem
              key={page.id}
              id={page.id}
              page={page}
              isSelected={currentPage === page.id}
              onClick={() => setCurrentPage(page.id)}
              onDelete={handleDeletePage}
            />)}
          </SortableContext>
          <AddPageListItem
            schema={schema}
            onChange={onChange}
            setCurrentPage={setCurrentPage}
          />
        </DndContext>
      </div>
    </div>
  );
}
