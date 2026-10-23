import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';

export default {
  type: 'Element',
  group: 'Containers',
  Icon: PlaylistAddIcon,
  defaultData: {
    type: 'array',
    description: 'Зацікавлені особи',
    items: {
      properties: {
        firstName: {
          type: 'string',
          description: "Ім'я",
        },
        lastName: {
          type: 'string',
          description: 'Прізвище',
        },
      },
      required: [],
      type: 'object',
    },
    allowEmpty: true,
    clearWhenEmpty: true,
    maxElements: undefined,
  },
};
