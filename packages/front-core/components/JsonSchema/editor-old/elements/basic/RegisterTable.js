import TableChartIcon from '@mui/icons-material/TableChart';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: TableChartIcon,
  defaultData: {
    control: 'register.table',
    description: 'Очікувані кількісні результати',
    keyId: '140',
    recordId: '5c2c8a80-f581-11e9-a9df-ad3bb6c8ffa8',
    dataSource: 'data.resultsQuantity',
    items: {
      checked: {
        control: 'toggle',
        width: 32,
      },
      resultName: {
        control: 'text.block',
        pure: true,
      },
      resultValue: {
        type: 'number',
      },
      resultType: {
        control: 'text.block',
        pure: true,
      },
    },
  },
};
