import { useState } from 'react';

const initialFilters = {
  timeStep: 'hour',
  duringThisPeriod: '1 day',
  untilThisMoment: 'NOW()',
};

const timeSteps = {
  '1 day': 'hour',
  '1 month': 'week',
  '1 year': 'month',
};

const useFilters = () => {
  const [filters, setFilters] = useState(initialFilters);

  return [
    filters,
    (newFilters) => {
      if (newFilters.duringThisPeriod !== filters.duringThisPeriod) {
        newFilters.timeStep = timeSteps[newFilters.duringThisPeriod];
        newFilters.untilThisMoment = 'NOW()';
      }
      setFilters(newFilters);
    },
  ];
};

export default useFilters;
