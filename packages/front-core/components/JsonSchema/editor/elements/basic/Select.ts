import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  snippet: 'Select',
  Icon: ViewStreamOutlinedIcon,
  defaultData: {
    type: 'string',
    description: 'Заголовок',
    options: [
      {
        id: 'Id першого пункту',
        name: 'Назва першого пункту',
      },
      {
        id: 'Id другого пункту',
        name: 'Назва другого пункту',
      },
    ],
  },
};
