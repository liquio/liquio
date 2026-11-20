import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: AttachMoneyIcon,
  defaultData: {
    type: 'object',
    control: 'payment',
    description: 'Оплата',
    sample: 'Сума до сплати',
    paymentType: undefined,
    customer: undefined,
    paymentControlPath: undefined,
    recipients: [],
  },
};
