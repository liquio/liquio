import { useDispatch } from 'react-redux';
import * as api from 'services/api';
import useTable from 'services/dataTable/useTable';
import { addError } from 'actions/error';

const dataURL = 'workflow-logs/reindex';

const useReindex = () => {
  const dispatch = useDispatch();
  const tableProps = useTable({ dataURL, sourceName: dataURL, autoLoad: true });

  const handleReindex = async (filters) => {
    try {
      await api.post(dataURL, filters, 'REINDEX_WORKFLOW_LOGS', dispatch);
      await tableProps.actions.load();
    } catch (error) {
      dispatch(addError(new Error(error?.message)));
    }
  };

  return { tableProps, handleReindex };
};

export default useReindex;
