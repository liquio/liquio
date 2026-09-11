import { horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';

const useStyles = makeStyles((theme) => ({
  listItem: {
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '170px',
    minWidth: '170px',
    height: '200px',
    overflow: 'hidden',
    textAlign: 'center',
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    position: 'relative',
  },
  dragging: {
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
    transform: 'scale(1.05)',
    zIndex: 1000,
  },
  active: {
    backgroundColor: '#BB86FC',
    // backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
  dragButton: {
    cursor: 'grab',
    userSelect: 'none',
    fontSize: 21
  },
  title: {
    fontWeight: 'bold',
    marginBottom: theme.spacing(1),
    fontSize: 18,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    width: '100%',
  },
  description: {
    fontSize: 16,
    color: theme.palette.text.secondary,
    flexGrow: 1,
    fontWeight: 600,
  },
  deleteIcon: {
    position: 'absolute',
    cursor: 'pointer',
    bottom: 10,
    right: 10,
  }
}));

export const PageListItem = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.id,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
    strategy: horizontalListSortingStrategy
  });

  const classes = useStyles();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={classNames({
        [classes.listItem]: true,
        [classes.dragging]: isDragging,
        [classes.active]: props.isSelected,
      })}
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick(props.id);
      }}
      {...attributes}
    >
      <span {...listeners} className={classes.dragButton}>☰</span>
      <span className={classes.title}>{props.id}</span>
      <span className={classes.description}>{props.page?.title}</span>
      <svg
        className={classes.deleteIcon}
        xmlns="http://www.w3.org/2000/svg"
        height="20"
        viewBox="0 0 24 24"
        width="20"
        fill="black"
        onClick={(e) => {
          e.stopPropagation();
          props.onDelete?.(props.id);
        }}
      >
        <path d="M0 0h24v24H0z" fill="none" />
        <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
      </svg>
    </div >
  );
}
