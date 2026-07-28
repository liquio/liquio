import RadioButtonCheckedOutlinedIcon from '@mui/icons-material/RadioButtonCheckedOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: RadioButtonCheckedOutlinedIcon,
  defaultData: {
    type: 'string',
    control: 'radio.group',
    description: 'Виберіть працівника року',
    defaultValue: 'Біл Гейц',
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
