import React from 'react';
import classNames from 'classnames';
import { makeStyles } from '@mui/styles';
import { TreeView } from '@mui/x-tree-view/TreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoIcon from '@mui/icons-material/Info';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

const useStyles = makeStyles({
  item: {
    color: '#ffffff',
    '& div': {
      color: '#ffffff',
    },
  },
  itemNew: {
    color: '#b5cea8',
    '& div': {
      color: '#b5cea8',
    },
  },
  itemDeleted: {
    color: '#ce9178',
    '& div': {
      color: '#ce9178',
    },
  },
  itemModified: {
    color: '#ffd700',
    '& div': {
      color: '#ffd700',
    },
  },
  labelRoot: {
    display: 'flex',
    alignItems: 'center',
    padding: 4,
  },
  icon: {
    fontSize: 16,
    marginRight: 4,
  },
});

const VersionTreeMenu = ({ tree, onClick }) => {
  const classes = useStyles();

  const renderTree = (nodes) => {
    if (!nodes.data && !nodes.compare && !nodes.children) {
      return null;
    }

    let icon = null;

    if (
      (nodes.compare !== undefined || nodes.data !== undefined) &&
      nodes.compare !== nodes.data
    ) {
      if (nodes.compare && !nodes.data) {
        icon = <DeleteOutlinedIcon className={classes.icon} />;
        // } else if (!nodes.compare && nodes.data) {
        //     icon = <AddCircleOutlineOutlinedIcon className={classes.icon} />;
      } else if (nodes.compare) {
        icon = <InfoIcon className={classes.icon} />;
      }
    }

    return (
      <TreeItem
        key={nodes.id}
        nodeId={nodes.id}
        label={
          <div className={classes.labelRoot}>
            {icon}
            {nodes.name}
          </div>
        }
        className={classNames({
          [classes.item]: true,
          [classes.itemNew]: !nodes.compare && nodes.data,
          [classes.itemDeleted]: nodes.compare && !nodes.data,
          [classes.itemModified]: nodes.compare && nodes.data,
        })}
        onClick={() => onClick && onClick(nodes)}
      >
        {Array.isArray(nodes.children)
          ? nodes.children.map((node) => renderTree(node))
          : null}
      </TreeItem>
    );
  };

  return (
    <TreeView
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpanded={['root']}
      defaultExpandIcon={<ChevronRightIcon />}
    >
      {renderTree(tree)}
    </TreeView>
  );
};

export default VersionTreeMenu;
