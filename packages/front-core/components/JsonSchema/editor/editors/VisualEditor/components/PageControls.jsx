import { makeStyles } from '@mui/styles';
import { useEffect, useState } from 'react';

import classNames from 'classnames';

import {
  ThemeProvider,
  createTheme,
  adaptV4Theme,
} from '@mui/material/styles';

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDndContext,
  DragOverlay,
  useDndMonitor,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Editable } from './Editable';
import { SortableField } from './SortableField';

import theme from '../theme';


const useStyles = makeStyles({
  root: {
    display: 'flex',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    color: '#333',
    backgroundColor: '#fff',
    overflowY: 'auto'
  },
  page: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)',
    margin: '0 auto',
    minHeight: '100%',
  },
  dragging: {
    backgroundColor: '#63ccff',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  dragButton: {
    cursor: 'grab',
    userSelect: 'none',
    marginRight: '8px',
    color: '#ccc',
  },
  input: {
    fontSize: 16,
    color: '#333',
    border: '1px solid #ccc',
    padding: 8,
    borderRadius: 4,
    flex: 1,
  },
  button: {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '2px 6px',
    fontSize: '14px',
    borderRadius: 3,
    cursor: 'pointer',
  },
  cancelButton: {
    background: '#666',
    color: '#fff',
    border: 'none',
    padding: '2px 6px',
    fontSize: '14px',
    borderRadius: 3,
    cursor: 'pointer',
  },
});

export const PageControls = ({
  schema,
  onChange,
  currentPage,
  setCurrentPage,
  fullSchema,
  setSchema,
}) => {
  const classes = useStyles();

  const [propertyList, setPropertyList] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const { measureDroppableContainers } = useDndContext();

  useEffect(() => {
    setPropertyList(Object.entries(schema.properties || {}));
  }, [schema.properties]);

  const { setNodeRef } = useDroppable({
    id: 'page-drop-zone',
  });

  useDndMonitor({
    onDragEnd: (event) => {
      setIsDragging(false);

      const { over } = event;
      if (over?.id === 'page-drop-zone') {
        let propertyData;

        try {
          propertyData = JSON.parse(event.active.data.current?.element?.data);
          propertyData = JSON.parse(propertyData.code);
        } catch (e) {
          propertyData = event.active.data.current?.element?.data || {};
        }

        const newKey = `new-property-${Date.now()}`;
        // setPropertyList((prev) => [...prev, [newKey, newProperty]]);
        onChange?.({
          ...schema,
          properties: {
            ...schema.properties,
            [newKey]: propertyData,
          },
        });

      }
    },
    onDragMove: (event) => {
      const { over } = event;

      console.log('activeId', event);
      setIsDragging(over?.id === 'page-drop-zone');
    },
  })

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = propertyList.findIndex(([key]) => key === active.id);
    const newIndex = propertyList.findIndex(([key]) => key === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newList = arrayMove(propertyList, oldIndex, newIndex);
      setPropertyList(newList);
      onChange?.({
        ...schema,
        properties: Object.fromEntries(newList),
      });
    }
  };

  const handleChangeDescription = newDescription => onChange({
    ...schema,
    description: newDescription,
  });

  const handleChangePageId = newPageId => {
    const entries = Object.entries(fullSchema.properties || {});
    const newEntries = entries.map(([key, val]) =>
      key === currentPage ? [newPageId, val] : [key, val]
    );
    setSchema({
      ...fullSchema,
      properties: Object.fromEntries(newEntries),
    });
    setCurrentPage(newPageId);
  };

  return (
    <div className={classes.root}>
      <div
        ref={setNodeRef}
        className={classNames({
          [classes.page]: true,
          [classes.dragging]: isDragging,
        })}
      >
        <Editable
          component="span"
          value={currentPage}
          onChange={handleChangePageId}
          style={{
            display: 'block',
            fontSize: '18px',
            color: '#666',
            marginBottom: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        />
        <Editable
          component="h1"
          value={schema.description}
          onChange={handleChangeDescription}
        />
        <ThemeProvider
          theme={createTheme(adaptV4Theme(theme))}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
          >
            <SortableContext
              items={propertyList.map(([key]) => key)}
              strategy={verticalListSortingStrategy}
              onDragStart={() => {
                // force re-measurement of droppable containers
                measureDroppableContainers();
              }}
            >
              {propertyList.map(([key, value], index) => (
                <SortableField
                  key={key}
                  id={key}
                  value={value}
                  index={index}
                  classes={classes}
                  isSelected={selectedId === key}
                  onClick={setSelectedId}
                  onChange={onChange}
                  schema={schema}
                  setSchema={setSchema}
                  currentPage={currentPage}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <SortableField
                  id={activeId}
                  value={propertyList.find(([key]) => key === activeId)?.[1] || {}}
                  index={-1}
                  classes={classes}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </ThemeProvider>
      </div>
    </div>
  );
};
