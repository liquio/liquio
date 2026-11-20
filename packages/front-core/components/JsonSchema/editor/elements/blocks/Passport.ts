import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';

export const type = 'Element';
export const group = 'Passport';

export default {
  type,
  group,
  snippet: 'Passport',
  Icon: AssignmentIndOutlinedIcon,
  defaultData: {
    type: 'object',
    description: 'Паспорт',
    properties: {
      pasNumber: {
        description: '',
        control: 'form.group',
        blockDisplay: false,
        outlined: false,
        properties: {
          serie: {
            type: 'string',
            description: 'Серія',
            width: 65,
            mask: '**',
            formatChars: {
              '*': '[а-яА-ЯЁёєЄіІїЇґҐ]',
            },
            changeCase: 'toUpperCase',
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 2',
                errorText: 'Має містити 2 букви',
              },
            ],
          },
          number: {
            type: 'string',
            description: 'номер',
            width: 144,
            mask: '999999',
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 6',
                errorText: 'Невірно введений номер. Номер має містити 6 цифр',
              },
            ],
          },
        },
        required: [],
      },
      dateHeader: {
        control: 'text.block',
        htmlBlock:
          "<p style='font-size: 12px; line-height: 16px; color: #000; color: '#444444'; margin-top: 0; margin-bottom: -5px;'>Дата видачі</p>",
      },
      date: {
        description: '',
        control: 'form.group',
        blockDisplay: false,
        outlined: false,
        checkValid: [
          {
            isValid:
              '(propertyData, pageObject, documentDataObject) => { const day = pageObject.passport.tabs.passport.date.day; const month = parseInt(pageObject.passport.tabs.passport.date.month) - 1; const year = pageObject.passport.tabs.passport.date.year; var issueDate = new Date(year, month, day).getTime(); const bday = pageObject.dateOfBirth.day; const bmonth = parseInt(pageObject.dateOfBirth.month) -1; const byear = parseInt(pageObject.dateOfBirth.year)+14; var today14 = new Date(byear, bmonth, bday).getTime(); return today14 && issueDate && (issueDate >= today14); }',
            errorText: 'Паспорт не можна отримати до 14 років',
          },
          {
            isValid:
              '(propertyData, pageObject, documentDataObject) => { const day = pageObject.passport.tabs.passport.date.day; const month = parseInt(pageObject.passport.tabs.passport.date.month) - 1; const year = pageObject.passport.tabs.passport.date.year; var issueDate = new Date(year, month, day).getTime(); return issueDate && (issueDate >= new Date(1994, 0, 1)) }',
            errorText: 'Дата видачі не може бути раніше 1994 року',
          },
          {
            isValid:
              '({day, month}) => { const dayNum = Number(day); const monthNum = Number(month); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.includes(monthNum)) countDaysInMonth = 29; if (_31daysMonth.includes(monthNum)) countDaysInMonth = 31; return day && countDaysInMonth && (day <= countDaysInMonth)}',
            errorText: 'В місяці менше днів, ніж Ви вказали',
          },
          {
            isValid:
              '({day, month, year}) => { const yearNum = Number(year); const monthNum = Number(month); const dayNum = Number(day); return ((dayNum && monthNum && yearNum) && !(dayNum === 29 && monthNum === 2 && yearNum % 4 !== 0 ));}',
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
      passIssurer: {
        type: 'string',
        description: 'Ким виданий',
        unzr: {
          type: 'string',
          description: 'УНЗР',
          maxWidth: 346,
          mask: '99999999-99999',
          checkValid: [
            {
              isValid:
                '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length && (propertyValue.length === 14)',
              errorText: 'Невірно введений номер. Номер має містити 14 цифр',
            },
          ],
          sample:
            '<div style="background: #FFF4D7; color:#000; padding: 5px 10px 5px 10px; line-height: 16px;font-family:e-Ukraine; font-size: 12px; margin-top: -5px;">УНЗР можна знайти в біометричному закордонному паспорті</div>',
        },
      },
    },
  },
};
