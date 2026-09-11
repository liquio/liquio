import React from 'react';

import { ListItem, ListItemIcon, ListItemText } from '@mui/material';

import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const PropertyItem = ({ path, active, setPath, property, propertyName }) => {
  const [open, setOpen] = React.useState(false);
  const hasOwnProperties =
    property.properties && Object.keys(property.properties).length;
  const selected = active.join() === path.join();

  const handleClick = () => {
    if (hasOwnProperties) {
      return setOpen(!open);
    }

    setPath(path);
  };

  return (
    <>
      <ListItem button onClick={handleClick} selected={selected}>
        <ListItemIcon>
          <CollectionsBookmarkIcon />
        </ListItemIcon>
        <ListItemText primary={property.description || propertyName} />
        {hasOwnProperties ? open ? <ExpandLess /> : <ExpandMore /> : null}
      </ListItem>
      {hasOwnProperties ? (
        <PropertyTree
          path={path}
          active={active}
          setPath={setPath}
          properties={property.properties}
        />
      ) : null}
    </>
  );
};

const PropertyTree = ({ path, active, setPath, properties = {} }) =>
  Object.keys(properties).map((propertyName) => (
    <PropertyItem
      key={propertyName}
      setPath={setPath}
      propertyName={propertyName}
      property={properties[propertyName]}
      path={path.concat(propertyName)}
      active={active}
    />
  ));

export default PropertyTree;
