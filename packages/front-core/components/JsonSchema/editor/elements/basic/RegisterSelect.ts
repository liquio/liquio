import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: StorageOutlinedIcon,
  defaultData: {
    type: 'array',
    control: 'register.select',
    keyId: [12, 13, 14, 15],
    description: 'Введіть номер або назву КВЕДа',
    disabled: undefined,
    filters: undefined,
    maxValues: undefined,
  },
};
