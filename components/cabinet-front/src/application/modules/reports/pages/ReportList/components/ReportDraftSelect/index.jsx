import React from 'react';

import useTable from 'services/dataTable/useTable';
import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import getDataUrl from 'modules/reports/pages/ReportList/components/ReportDraftSelect/helpers/getDataUrl';
import optionsToMenu from 'modules/reports/pages/ReportList/components/ReportDraftSelect/helpers/optionsToMenu';

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
}) => {
  const { data, loading, actions } = useTable(
    {
      dataURL: 'custom/bpmn-bi/reports',
      sourceName: 'biReports',
      autoLoad: true,
      getDataUrl
    },
    {
      rowsPerPage: 5000
    }
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
        onChange={onChange}
        options={data && data.map(optionsToMenu)}
        onChangePage={(e, page) => actions.onChangePage(page)}
      />
    </ElementContainer>
  );
};

export default ReportDraftSelect;
