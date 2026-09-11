import React from 'react';
import { translate } from 'react-translate';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { withEditor } from './../JsonSchemaProvider';
import getElementType from 'components/JsonSchema/editor/helpers/getElementType';
import SchemaItem from './SchemaItem';

const styles = {
  expandButton: {
    display: 'flex',
    cursor: 'pointer',
    padding: 5,
    paddingLeft: 15
  }
};

interface SchemaValue {
  properties?: Record<string, { control?: string; type?: string; snippet?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface PropertyListProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  path: string[];
  value: SchemaValue;
}

const PropertyList = ({ t, classes, path, value }: PropertyListProps) => {
  const [open, setOpen] = React.useState(false);
  const { properties } = value;

  if (!properties) {
    return null;
  }

  const content = Object.keys(properties).map((property) => (
    <SchemaItem
      key={property}
      draggable={true}
      path={path.concat(property)}
      value={properties[property]}
      elementType={getElementType(properties[property], path.concat(property))}
    />
  ));

  if (!path.length) {
    return content as unknown as React.ReactElement;
  }

  return (
    <>
      <Typography
        className={classes.expandButton}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        {t('Components')}
      </Typography>
      {open ? content : null}
    </>
  );
};

const styled = withStyles(styles)(PropertyList as never);
const translated = translate('JsonSchemaEditor')(styled as never);
export default withEditor(translated as unknown as React.ComponentType<Record<string, unknown>>);
