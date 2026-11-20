import _ from 'lodash/fp';
import useTable from 'services/dataTable/useTable';
import endPoint from 'services/dataTable/endpoints/registry';

interface UseRegisterTableProps {
  filters?: Record<string, unknown>;
  [key: string]: unknown;
}

export default ({ filters = {}, ...props }: UseRegisterTableProps) => {
  const tableProps = useTable(
    {
      ...endPoint,
      autoLoad: true
    },
    _.merge(props, {
      filters: { ...filters, strict: true }
    })
  );

  return tableProps;
};
