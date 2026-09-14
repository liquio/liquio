import React from 'react';
import useTable from 'services/dataTable/useTable';

import SelectRaw from 'components/Select';
import ElementContainerRaw from 'components/JsonSchema/components/ElementContainer';

import getDataUrl from 'modules/reports/pages/ReportTemplates/components/ReportDraftSelect/helpers/getDataUrl';
import optionsToMenu from 'modules/reports/pages/ReportTemplates/components/ReportDraftSelect/helpers/optionsToMenu';

const Select = SelectRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ElementContainer = ElementContainerRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportDraftSelectProps {
  description?: string;
  path: string[];
  onChange?: (value: unknown) => void;
  value?: unknown;
  sample?: unknown;
  required?: boolean;
  error?: unknown;
  width?: number | string;
  noMargin?: boolean;
  darkTheme?: boolean;
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
  noMargin,
  darkTheme,
}: ReportDraftSelectProps) => {
  const { data, loading, actions } = useTable(
    {
      dataURL: 'bi/report-drafts',
      sourceName: 'biReports',
      autoLoad: true,
      getDataUrl,
    } as never,
    {
      rowsPerPage: 5000,
    } as never,
  );

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
        darkTheme={darkTheme}
        onChange={onChange}
        options={
          (data as { reportTemplateDrafts?: unknown[] })?.reportTemplateDrafts &&
          (data as { reportTemplateDrafts: unknown[] }).reportTemplateDrafts.map(optionsToMenu as never)
        }
        onChangePage={(e: unknown, page: number) => (actions as { onChangePage: (page: number) => void }).onChangePage(page)}
      />
    </ElementContainer>
  );
};

export default ReportDraftSelect;
