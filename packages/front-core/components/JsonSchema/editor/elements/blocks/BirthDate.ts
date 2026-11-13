import PermContactCalendarOutlinedIcon from '@mui/icons-material/PermContactCalendarOutlined';

export const type = 'Element';
export const group = 'ElementBlocks';

export default {
  type,
  group,
  snippet: 'BirthDate',
  Icon: PermContactCalendarOutlinedIcon,
  defaultData: {
    description: 'Дата народження',
    type: 'object',
    control: 'form.group',
    blockDisplay: false,
    outlined: false,
    checkValid: [
      {
        isValid:
          '({day, month, year}) => { const dayNum = Number(day); const monthNum = Number(month); const yearNum = Number(year); return ((dayNum && monthNum && yearNum) && (new Date(yearNum, monthNum - 1, dayNum) < Date.now()))}',
        errorText: 'Дата народження не може бути більше поточної',
      },
      {
        isValid:
          '({day, month}) => { const dayNum = Number(day); const monthNum = Number(month); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.includes(monthNum)) countDaysInMonth = 29; if (_31daysMonth.includes(monthNum)) countDaysInMonth = 31; return day && countDaysInMonth && (day <= countDaysInMonth)}',
        errorText: 'В місяці менше днів, ніж ви вказали',
      },
      {
        isValid:
          '({day, month, year}) => { const yearNum = Number(year); const monthNum = Number(month); const dayNum = Number(day); return ((dayNum && monthNum && yearNum) && !(dayNum === 29 && monthNum === 2 && yearNum % 4 !== 0 ));}',
        errorText: 'Цей рік не високосний, у лютому 28 днів',
      },
    ],
    properties: {
      day: {
        type: 'string',
        description: 'число',
        pattern: '^0*([1-9]|[12][0-9]|3[01])$',
        width: 65,
        maxLength: 2,
      },
      month: {
        type: 'string',
        description: 'місяць',
        width: 200,
        options: [
          {
            id: '01',
            name: 'січня',
          },
          {
            id: '02',
            name: 'лютого',
          },
          {
            id: '03',
            name: 'березня',
          },
          {
            id: '04',
            name: 'квітня',
          },
          {
            id: '05',
            name: 'травня',
          },
          {
            id: '06',
            name: 'червня',
          },
          {
            id: '07',
            name: 'липня',
          },
          {
            id: '08',
            name: 'серпня',
          },
          {
            id: '09',
            name: 'вересня',
          },
          {
            id: '10',
            name: 'жовтня',
          },
          {
            id: '11',
            name: 'листопада',
          },
          {
            id: '12',
            name: 'грудня',
          },
        ],
      },
      year: {
        type: 'string',
        description: 'рік',
        width: 65,
        pattern: '([1-2]\\d{3})',
        mask: '9999',
      },
    },
    required: [],
  },
};
