import _ from 'lodash/fp';
import useTable from 'services/dataTable/useTable';
import endPoint from 'services/dataTable/endpoints/registry';

export default ({ filters = {}, ...props }) => {
  const tableProps = useTable(
    {
      ...endPoint,
      autoLoad: true,
    },
    _.merge(props, {
      filters: { ...filters, strict: true },
    }),
  );

  return tableProps;
};
