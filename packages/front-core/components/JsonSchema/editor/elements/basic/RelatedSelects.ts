import ViewStreamOutlinedIcon from '@mui/icons-material/ViewStreamOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  snippet: 'Select',
  Icon: ViewStreamOutlinedIcon,
  defaultData: {
    type: 'object',
    control: 'related.selects',
    description: 'Випадаючий список',
    properties: {
      level1: {
        description: 'Поле 1',
      },
      level2: {
        description: 'Поле 2',
      },
      level3: {
        description: 'Поле 3',
      },
    },
    options: [
      {
        id: '1',
        name: 'Значення 1',
        items: [
          {
            id: '2',
            name: 'Значення 2',
          },
          {
            id: '3',
            name: 'Значення 3',
          },
        ],
      },
      {
        id: '4',
        name: 'Значення 4',
        items: [
          {
            id: '5',
            name: 'Значення 5',
          },
          {
            id: '6',
            name: 'Значення 6',
            items: [
              {
                id: '7',
                name: 'Значення 7',
              },
              {
                id: '8',
                name: 'Значення 8',
              },
            ],
          },
        ],
      },
    ],
  },
};
