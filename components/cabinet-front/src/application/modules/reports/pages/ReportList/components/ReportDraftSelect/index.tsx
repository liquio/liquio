import React from 'react';

import useTable from 'services/dataTable/useTable';
import SelectRaw from 'components/Select';
import ElementContainerRaw from 'components/JsonSchema/components/ElementContainer';
import getDataUrl from 'modules/reports/pages/ReportList/components/ReportDraftSelect/helpers/getDataUrl';
import optionsToMenu from 'modules/reports/pages/ReportList/components/ReportDraftSelect/helpers/optionsToMenu';

const Select = SelectRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportDraftSelectProps {
  description?: string;
  path: string[];
  onChange: (value: unknown) => void;
  value?: unknown;
  sample?: unknown;
  required?: boolean;
  error?: unknown;
  width?: number | string;
  noMargin?: boolean;
}

const ReportDraftSelect = ({
  description,
  path,
  onChange,
  value,
  sample,
  required,
  error,
  width,
  noMargin
}: ReportDraftSelectProps) => {
  // Read at call time rather than module scope: this component is passed
  // into JsonSchema's SchemaForm as a customControl, and ElementContainer
  // is imported from within components/JsonSchema itself — deferring the
  // cast avoids any risk of a module-top-level TDZ read if that ever
  // becomes part of a circular import chain (see TYPESCRIPT.md).
  const ElementContainer = ElementContainerRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const { data, loading, actions } = useTable(
    {
      dataURL: 'custom/bpmn-bi/reports',
      sourceName: 'biReports',
      autoLoad: true,
      getDataUrl
    },
    {
      rowsPerPage: 5000
    } as never
  ) as { data: unknown[]; loading: boolean; actions: { onChangePage: (page: number) => void } };

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      width={width}
      noMargin={noMargin}
    >
      <Select
        description={description}
        inputProps={{ id: path.join() }}
        isLoading={loading}
        value={value}
        error={error}
        multiple={false}
        onChange={onChange}
        options={data && data.map(optionsToMenu as never)}
        onChangePage={(e: unknown, page: number) => actions.onChangePage(page)}
      />
    </ElementContainer>
  );
};

export default ReportDraftSelect;
