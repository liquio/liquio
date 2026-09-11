import { Chip } from '@mui/material';
import React from 'react';
import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';

const ReportFilters = ({ report }) => {
  const stringifiedFilters = React.useMemo(() => {
    const {
      data: { filters },
      report: {
        data: { schema = {} },
      },
    } = report;
    const stringifiedFilters = [];
    propertiesEach(
      schema,
      filters,
      (schema, data, path) => {
        if (typeof data !== 'undefined' && typeof data !== 'object') {
          stringifiedFilters.push(`${schema.description || path}: ${data}`);
        }
      },
    );
    return stringifiedFilters;
  }, [report]);

  return stringifiedFilters.length ? (
    <div style={{ paddingLeft: 5 }}>
      {stringifiedFilters.map((filter, index) => (
        <Chip
          key={index}
          label={filter}
          style={{ marginRight: 5, marginBottom: 5, marginTop: 5 }}
        />
      ))}
    </div>
  ) : null;
};

export default ReportFilters;
