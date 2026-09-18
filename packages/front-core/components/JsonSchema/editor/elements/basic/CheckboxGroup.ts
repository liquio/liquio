import LibraryAddCheckOutlinedIcon from '@mui/icons-material/LibraryAddCheckOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: LibraryAddCheckOutlinedIcon,
  defaultData: {
    type: 'array',
    control: 'checkbox.group',
    description: 'Виберіть працівників року',
    defaultValue: ['Біл Гейц'],
    items: [
      {
        id: 'Біл Гейц',
        title: 'Біл Гейц',
      },
      {
        id: 'Тім Епл',
        title: 'Тім Епл',
      },
    ],
    rowDirection: true,
  },
};
