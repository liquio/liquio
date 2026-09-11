import React from 'react';
import { useDrop, type DropTargetMonitor } from 'react-dnd';
import classNames from 'classnames';
import { Card, CardHeader, IconButton, TextField, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { withEditor } from './../JsonSchemaProvider';
import PropertyList from './PropertyList';
import ElementIdDialog from './ElementIdDialog';
import ExistedElementDialog from './ExistedElementDialog';

const styles = {
  root: {
    margin: 4,
    overflowWrap: 'anywhere' as const,
    cursor: 'pointer'
  },
  selected: {
    background: '#444444'
  },
  isOver: {
    background: '#232323'
  },
  cardHeader: {
    color: '#fff'
  },
  properties: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: 8
  },
  property: {
    margin: 8,
    '& > h6': {
      fontSize: 14,
      marginBottom: 4
    }
  }
};

interface NewElementItem {
  type?: string;
  defaultData?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SchemaItemProps {
  path: string[];
  value: Record<string, unknown>;
  classes: Record<string, string>;
  selection?: string[];
  elementType: unknown;
  setSelection: (path: string[]) => void;
  createElementAt: (element: NewElementItem, path: string[], elementId: string) => void;
  deleteElementAt: (path: string[]) => void;
  isElementExists: (elementId: string, path: string[]) => boolean;
}

const SchemaItem = (props: SchemaItemProps) => {
  const {
    path,
    value,
    classes,
    selection,
    elementType,
    setSelection,
    createElementAt,
    deleteElementAt,
    isElementExists
  } = props;
  const [newElement, setNewElement] = React.useState<NewElementItem | null>(null);
  const [existed, setExisted] = React.useState<string | null>(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['control', 'container'],
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    }),
    drop(item: NewElementItem, monitor: DropTargetMonitor) {
      const didDrop = monitor.didDrop();
      if (didDrop || !monitor.isOver({ shallow: true })) {
        return;
      }
      setNewElement(item);
    }
  } as never) as unknown as [{ isOver: boolean; canDrop: boolean }, (node: HTMLElement | null) => void];

  const selected = (selection || []).join() === (path || []).join();

  const createNewElement = (elementId: string) => {
    createElementAt(newElement as NewElementItem, path, elementId);
    setNewElement(null);
  };

  const ElementIcon = (elementType as { Icon?: React.ComponentType }).Icon;

  return (
    <>
      <Card
        ref={drop as never}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={classNames(classes.root, {
          [classes.selected]: selected,
          [classes.isOver]: isOver && canDrop
        })}
      >
        <CardHeader
          className={classes.cardHeader}
          classes={{
            subheader: classes.cardHeader,
            title: classes.cardHeader
          }}
          avatar={ElementIcon ? <ElementIcon /> : null}
          onClick={() => setSelection(path)}
          action={
            path.length ? (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  deleteElementAt(path);
                }}
              >
                <DeleteOutlineIcon />
              </IconButton>
            ) : null
          }
          title={(value.description as string) || path[path.length - 1] || 'root'}
          subheader={path.join('.')}
        />
        <PropertyList
          {...({
            path,
            value,
            elementType,
            isOver,
            canDrop
          } as unknown as Record<string, unknown>)}
        />
      </Card>

      {selected && (path || []).length > 0 ? (
        <div className={classes.properties}>
          {Object.keys(value).map((key) => (
            <div key={key} className={classes.property}>
              <Typography variant="h6">{key}</Typography>
              <TextField value={value[key] as string} />
            </div>
          ))}
        </div>
      ) : null}

      <ElementIdDialog
        open={!!newElement}
        onClose={() => setNewElement(null)}
        onSave={(elementId) => {
          if (isElementExists(elementId, path)) {
            return setExisted(elementId);
          }

          createNewElement(elementId);
        }}
      />

      <ExistedElementDialog
        {...({
          open: !!existed,
          onClose: () => setExisted(null),
          onSave: () => {
            createNewElement(existed as string);
            setExisted(null);
          }
        } as unknown as Record<string, unknown>)}
      />
    </>
  );
};

const styled = withStyles(styles)(SchemaItem as never);

export default withEditor(styled as unknown as React.ComponentType<Record<string, unknown>>);
