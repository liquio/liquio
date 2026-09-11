import React from 'react';
import { useDrop } from 'react-dnd';
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
    overflowWrap: 'anywhere',
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
    flexDirection: 'column',
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

const SchemaItem = (props) => {
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
  const [newElement, setNewElement] = React.useState(null);
  const [existed, setExisted] = React.useState(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['control', 'container'],
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    }),
    drop(item, monitor) {
      const didDrop = monitor.didDrop();
      if (didDrop || !monitor.isOver({ shallow: true })) {
        return;
      }
      setNewElement(item);
    }
  });

  const selected = (selection || []).join() === (path || []).join();

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
          avatar={elementType.Icon ? <elementType.Icon /> : null}
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

      {selected && (path || []).length > 0 ? (
        <div className={classes.properties}>
          {Object.keys(value).map((key) => (
            <div key={key} className={classes.property}>
              <Typography variant="h6">{key}</Typography>
              <TextField value={value[key]} />
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
