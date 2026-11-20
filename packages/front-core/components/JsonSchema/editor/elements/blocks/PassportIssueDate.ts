import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined';

export const type = 'Element';
export const group = 'Passport';

export default {
  type,
  group,
  snippet: 'PassportIssueDate',
  Icon: DateRangeOutlinedIcon,
  defaultData: {
    description: 'Дата видачі паспорта',
    control: 'form.group',
    blockDisplay: false,
    outlined: false,
    checkValid: [
      {
        isValid:
          '(propertyData, pageObject, documentDataObject) => { const day = pageObject.tabs.passport.date.day; const month = parseInt(pageObject.tabs.passport.date.month) - 1; const year = pageObject.tabs.passport.date.year; var issueDate = new Date(year, month, day).getTime(); var today = new Date().getTime(); return issueDate && (issueDate < today); }',
        errorText: 'Виправте дату видачі, вона не може бути більше поточної',
      },
      {
        isValid:
          '(propertyData, pageObject, documentDataObject) => { const day = pageObject.tabs.passport.date.day; const month = parseInt(pageObject.tabs.passport.date.month) - 1; const year = pageObject.tabs.passport.date.year; var issueDate = new Date(year, month, day).getTime(); return issueDate && (issueDate >= new Date(1994, 0, 1)) }',
        errorText: 'Дата видачі не може бути раніше 1994 року',
      },
      {
        isValid:
          '(propertyData, pageObject, documentDataObject) => { const day = pageObject.tabs.passport.date.day; const month = parseInt(pageObject.tabs.passport.date.month); const dayNum = Number(day); const monthNum = Number(month); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.includes(monthNum)) countDaysInMonth = 29; if (_31daysMonth.includes(monthNum)) countDaysInMonth = 31; return (day && (day <= countDaysInMonth));}',
        errorText: 'В місяці менше днів, ніж Ви вказали',
      },
      {
        isValid:
          '({day, month, year}) => { const yearNum = Number(year); const monthNum = Number(month); const dayNum = Number(day); return dayNum && monthNum && yearNum && !(dayNum === 29 && monthNum === 2 && yearNum % 4 !== 0 );}',
        errorText: 'Не високосний рік. У лютому тільки 28 днів.',
      },
      {
        isValid:
          '({day, month, year}) => { const yearNum = Number(year); const monthNum = Number(month); const dayNum = Number(day); return dayNum && monthNum && yearNum && ((new Date(yearNum, monthNum - 1, dayNum) <= Date.now()) && yearNum < 2019); }',
        errorText: 'Дата видачі не може бути пізніше 2018 року',
      },
    ],
    properties: {
      day: {
        type: 'string',
        description: 'число',
        pattern: '^0*([1-9]|[12][0-9]|3[01])$',
        width: 70,
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
        width: 70,
        pattern: '([1-2]\\d{3})',
        mask: '9999',
      },
    },
    required: [],
  },
};
