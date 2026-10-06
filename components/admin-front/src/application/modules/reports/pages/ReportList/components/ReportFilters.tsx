import { Chip } from '@mui/material';
import React from 'react';
import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';

interface ReportLike {
  data: { filters: unknown };
  report: { data: { schema?: Record<string, unknown> } };
}

interface ReportFiltersProps {
  report: ReportLike;
}

const ReportFilters = ({ report }: ReportFiltersProps) => {
  const stringifiedFilters = React.useMemo(() => {
    const {
      data: { filters },
      report: {
        data: { schema = {} },
      },
    } = report;
    const stringifiedFilters: string[] = [];
    propertiesEach(
      schema as never,
      filters,
      ((schema: { description?: string }, data: unknown, path: string) => {
        if (typeof data !== 'undefined' && typeof data !== 'object') {
          stringifiedFilters.push(`${schema.description || path}: ${data}`);
        }
      }) as never,
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
