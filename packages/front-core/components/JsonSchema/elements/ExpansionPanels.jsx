import React from 'react';
import PropTypes from 'prop-types';

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import SchemaForm from '../SchemaForm';

const Accordions = ({
  properties,
  schema,
  readOnly,
  value,
  onChange,
  path,
  hidden,
  ...rest
}) =>
  Object.keys(properties).map((panelName) => {
    if (hidden) return null;

    return (
      <Accordion key={panelName}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          id={path.concat(panelName, 'panel').join('-')}
        >
          <Typography>{properties[panelName].description}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <SchemaForm
            {...rest}
            schema={properties[panelName]}
            path={path.concat(panelName)}
            readOnly={readOnly || properties[panelName].readOnly}
            value={value[panelName]}
            onChange={onChange.bind(null, panelName)}
            required={
              Array.isArray(schema.required)
                ? schema.required.includes(panelName)
                : schema.required
            }
          />
        </AccordionDetails>
      </Accordion>
    );
  });

Accordions.propTypes = {
  properties: PropTypes.object,
  errors: PropTypes.array,
  value: PropTypes.object,
  path: PropTypes.array,
  onChange: PropTypes.func,
};

Accordions.defaultProps = {
  properties: {},
  errors: [],
  value: {},
  path: [],
  onChange: () => null,
};

export default Accordions;
