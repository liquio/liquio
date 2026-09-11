import moment from 'moment';
import { useMemo } from 'react';

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';

const usePeriodOptions = (period) =>
  useMemo(() => {
    const now = moment();
    switch (period) {
      case '1 day':
        return [
          {
            value: 'NOW()',
            label: 'Last24Hours',
          },
          {
            value: now.clone().startOf('day').format(DATE_FORMAT),
            label: 'Today',
          },
          {
            value: now
              .clone()
              .subtract(1, 'day')
              .startOf('day')
              .format(DATE_FORMAT),
            label: 'Yesterday',
          },
        ];
      case '1 month':
        return [
          {
            value: 'NOW()',
            label: 'Last30Days',
          },
          {
            value: now.clone().startOf('month').format(DATE_FORMAT),
            label: 'ThisMonth',
          },
          {
            value: now
              .clone()
              .subtract(1, 'month')
              .startOf('month')
              .format(DATE_FORMAT),
            label: 'LastMonth',
          },
        ];
      case '1 year':
        return [
          {
            value: 'NOW()',
            label: 'Last12Months',
          },
          {
            value: now.clone().startOf('year').format(DATE_FORMAT),
            label: 'ThisYear',
          },
          {
            value: now
              .clone()
              .subtract(1, 'year')
              .startOf('year')
              .format(DATE_FORMAT),
            label: 'LastYear',
          },
        ];
      default:
        return [{}];
    }
  }, [period]);

export default usePeriodOptions;
