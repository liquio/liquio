import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: ToggleOffOutlinedIcon,
  defaultData: {
    type: 'boolean',
    control: 'toggle',
    offText: 'Виключено',
    onText: 'Включено',
    defaultValue: false,
  },
};
