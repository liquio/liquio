import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: ListAltOutlinedIcon,
  defaultData: {
    type: 'object',
    control: 'tree.select',
    options: [
      {
        id: '1',
        name: 'Значення 1',
        items: [
          {
            id: '1.1',
            name: 'Підзначення 1',
          },
        ],
      },
      {
        id: '2',
        name: 'Значення 2',
        items: [
          {
            id: '2.1',
            name: 'Підзначення 2',
          },
        ],
      },
    ],
    keyId: undefined,
    description: 'Дерево',
  },
};
