import React from 'react';

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import SchemaForm from '../SchemaForm';

interface ExpansionPanelsProps {
  properties?: Record<string, { description?: string; readOnly?: boolean; [key: string]: unknown }>;
  schema: { required?: string[] | boolean; [key: string]: unknown };
  readOnly?: boolean;
  value?: Record<string, unknown>;
  onChange: (panelName: string, ...args: unknown[]) => void;
  path: Array<string | number>;
  hidden?: boolean;
  [key: string]: unknown;
}

const Accordions = ({
  properties = {},
  schema,
  readOnly,
  value = {},
  onChange,
  path,
  hidden,
  ...rest
}: ExpansionPanelsProps) =>
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

Accordions.defaultProps = {
  properties: {},
  errors: [],
  value: {},
  path: [],
  onChange: () => null,
};

export default Accordions;
