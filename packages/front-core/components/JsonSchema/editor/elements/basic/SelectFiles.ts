import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: AttachFileOutlinedIcon,
  defaultData: {
    type: 'array',
    control: 'select.files',
    description: 'Додатки',
    sample: 'Додатки до заяви',
    accept:
      'image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    maxSize: 10485760,
    minItems: 1,
    labels: ['Паспорт', 'ІПН', 'Інщі'],
  },
};
