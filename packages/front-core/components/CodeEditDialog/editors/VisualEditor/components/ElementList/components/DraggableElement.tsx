import React from 'react';
import { translate } from 'react-translate';
import { DragPreviewImage, useDrag, useDrop, type DropTargetMonitor, type DragSourceMonitor } from 'react-dnd';
import { Toolbar, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import VisibilityIcon from '@mui/icons-material/Visibility';

import Icons from 'components/muiIcons';
import EditIcon from 'assets/icons/edit_icon.svg';
import previewImage from './dragImage';

const styles = {
  root: {
    justifyContent: 'flex-start',
    textAlign: 'left' as const,
    marginLeft: 5,
    marginRight: 5,
    textTransform: 'inherit' as const,
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
    color: '#CAC4D0',
    borderRadius: 30,
    padding: 16,
    position: 'relative' as const,
    '&:hover': {
      '& img': {
        opacity: 1
      },
      '& svg': {
        opacity: 1
      }
    }
  },
  label: {
    justifyContent: 'flex-start'
  },
  icon: {
    marginRight: 8
  },
  editIcon: {
    position: 'absolute' as const,
    right: 21,
    opacity: 0,
    fill: '#D0BCFF',
    color: '#D0BCFF',
    transition: 'opacity 0.25s ease-in-out'
  },
  editIconVisible: {
    opacity: 1
  }
};

interface ElementLike {
  type?: string;
  name?: string;
  data?: string;
  [key: string]: unknown;
}

const getSavedCode = (code: ElementLike, key: string): string => {
  try {
    const savedCode = JSON.parse(code.data as string);
    return savedCode[key] || '';
  } catch (e) {
    return '';
  }
};

interface DraggableElementProps {
  classes: Record<string, string>;
  element: ElementLike;
  setActiveSnippet?: (element: ElementLike) => void;
  setCreateSnippet?: (open: boolean, type?: string) => void;
  search?: string;
  readOnly?: boolean;
  index?: number;
  moveSnippet?: (dragIndex: number, hoverIndex: number) => void;
  visualEditor?: boolean;
}

const DraggableElement = ({
  classes,
  element,
  setActiveSnippet = () => {},
  setCreateSnippet = () => {},
  search = '',
  readOnly = false,
  index = 0,
  moveSnippet = () => {},
  visualEditor = false
}: DraggableElementProps) => {
  const button = React.useRef<HTMLElement>(null);

  const iconName = getSavedCode(element, 'icon');

  const IconComponent = iconName ? Icons[iconName] : null;

  const [{ handlerId }, drop] = useDrop({
    accept: ['control', 'function', 'container'],
    collect(monitor: DropTargetMonitor) {
      return {
        handlerId: monitor.getHandlerId()
      };
    },
    hover(item: { index: number }, monitor: DropTargetMonitor) {
      if (!button.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = button.current?.getBoundingClientRect();

      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      const clientOffset = monitor.getClientOffset();

      const hoverClientY = (clientOffset as { y: number }).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveSnippet(dragIndex, hoverIndex);

      item.index = hoverIndex;
    }
  } as never) as unknown as [{ handlerId: string | symbol | null }, (node: HTMLElement | null) => void];

  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: element?.type,
      defaultData: {
        ...element,
        description: element?.name
      }
    },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging()
    })
  } as never) as unknown as [
    { isDragging: boolean },
    (node: HTMLElement | null) => void,
    (node: unknown) => void
  ];

  const handleCLick = () => {
    setActiveSnippet(element);
    setCreateSnippet(true, element.type);
  };

  const highlightedSearch = (text?: string) => {
    if (!search) {
      return text;
    }

    const index = (text || '').toLowerCase().indexOf(search.toLowerCase());

    if (index === -1) {
      return text;
    }

    const before = (text || '').slice(0, index);
    const highlighted = (text || '').slice(index, index + search.length);
    const after = (text || '').slice(index + search.length);

    return (
      <>
        {before}
        <mark>{highlighted}</mark>
        {after}
      </>
    );
  };

  (drag as (node: unknown) => void)(drop(button as never));

  const opacity = isDragging ? 0.5 : 1;

  return (
    <>
      <DragPreviewImage connect={preview as never} src={previewImage} />
      <Toolbar disableGutters={true} ref={button as never}>
        <Button
          ref={drag as never}
          data-handler-id={handlerId}
          fullWidth={true}
          style={{ opacity }}
          classes={{
            root: classes.root,
            label: classes.label
          } as never}
          onClick={handleCLick}
        >
          {iconName && IconComponent ? <IconComponent className={classes.icon} /> : null}
          {highlightedSearch(element?.name)}
          {!visualEditor ? (
            <>
              {readOnly ? (
                <VisibilityIcon className={classes.editIcon} />
              ) : (
                <img src={EditIcon} alt="edit icon" className={classes.editIcon} />
              )}
            </>
          ) : null}
        </Button>
      </Toolbar>
    </>
  );
};

const styled = withStyles(styles)(DraggableElement as never);

export default translate('JsonSchemaEditor')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
