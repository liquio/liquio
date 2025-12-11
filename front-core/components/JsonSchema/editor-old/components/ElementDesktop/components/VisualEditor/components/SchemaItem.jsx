import React from 'react';
import { useDrop } from 'react-dnd';
import classNames from 'classnames';
import { Card, CardHeader, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { withEditor } from 'components/JsonSchema/editor/JsonSchemaProvider';
import PropertyList from './PropertyList';
import ElementIdDialog from './ElementIdDialog';
import ExistedElementDialog from './ExistedElementDialog';

const styles = {
  root: {
    margin: 4,
    overflowWrap: 'anywhere',
  },
  selected: {
    background: '#444444',
  },
  isOver: {
    background: '#232323',
  },
  cardHeader: {
    color: '#fff',
  },
};

const SchemaItem = ({
  path,
  value,
  classes,
  selection,
  elementType,
  setSelection,
  createElementAt,
  deleteElementAt,
  isElementExists,
}) => {
  const [newElement, setNewElement] = React.useState(null);
  const [existed, setExisted] = React.useState(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['control', 'container'],
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
    drop(item, monitor) {
      const didDrop = monitor.didDrop();
      if (didDrop || !monitor.isOver({ shallow: true })) {
        return;
      }
      setNewElement(item);
    },
  });

  const selected = selection.join() === path.join();

  const createNewElement = (elementId) => {
    createElementAt(newElement, path, elementId);
    setNewElement(null);
  };

  return (
    <>
      <Card
        ref={drop}
        onClick={(e) => {
          e.stopPropagation();
          setSelection(path);
        }}
        className={classNames(classes.root, {
          [classes.selected]: selected,
          [classes.isOver]: isOver && canDrop,
        })}
      >
        <CardHeader
          className={classes.cardHeader}
          classes={{
            subheader: classes.cardHeader,
            title: classes.cardHeader,
          }}
          avatar={elementType.Icon ? <elementType.Icon /> : null}
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
          title={value.description || path[path.length - 1] || 'root'}
          subheader={path.join('.')}
        />
        <PropertyList
          path={path}
          value={value}
          elementType={elementType}
          isOver={isOver}
          canDrop={canDrop}
        />
      </Card>
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
        open={!!existed}
        onClose={() => setExisted(null)}
        onSave={() => {
          createNewElement(existed);
          setExisted(null);
        }}
      />
    </>
  );
};

const styled = withStyles(styles)(SchemaItem);
export default withEditor(styled);
