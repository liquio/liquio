import DashboardIcon from '@mui/icons-material/Dashboard';

import { type as stepType } from './Step';

export const type = 'Board';
export const group = 'Containers';

export default {
  type,
  group,
  hide: true,
  snippet: 'Board',
  Icon: DashboardIcon,
  accept: stepType,
  isContainer: true,
  defaultData: {
    title: '',
    pdfRequired: true,
    forceRedirect: true,
    signRequired: true,
    isP7sSign: true,
    properties: {},
    stepOrders: '() = [];',
  },
};
