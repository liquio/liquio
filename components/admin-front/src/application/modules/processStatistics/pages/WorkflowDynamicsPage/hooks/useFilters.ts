import { useState } from 'react';

export interface DynamicsFilters {
  timeStep: string;
  duringThisPeriod: string;
  untilThisMoment: string;
}

const initialFilters: DynamicsFilters = {
  timeStep: 'hour',
  duringThisPeriod: '1 day',
  untilThisMoment: 'NOW()',
};

const timeSteps: Record<string, string> = {
  '1 day': 'hour',
  '1 month': 'week',
  '1 year': 'month',
};

const useFilters = (): [DynamicsFilters, (newFilters: DynamicsFilters) => void] => {
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
