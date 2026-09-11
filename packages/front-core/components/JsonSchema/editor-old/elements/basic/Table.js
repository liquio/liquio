import TableChartIcon from '@mui/icons-material/TableChart';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: TableChartIcon,
  defaultData: {
    type: 'array',
    control: 'table',
    description: 'Проста таблиця',
    rows: undefined,
    items: {
      name: {
        description: "Ім'я",
        type: 'string',
      },
      surname: {
        description: 'Прізвище',
        type: 'string',
      },
      age: {
        description: 'Вік',
        type: 'integer',
      },
    },
  },
};
