import objectPath from 'object-path';

import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';
import { validateDataAsync } from 'components/JsonSchema';
import removeEmptyFields from 'helpers/removeEmptyFields';
import evaluate from 'helpers/evaluate';
import checkIsHidden from 'components/JsonSchema/helpers/checkIsHidden';

const parseDate = (dateString) => {
  if (!dateString || dateString === 'Invalid date') return null;

  return {
    day: (dateString || '').split('.')[0] || '',
    month: (dateString || '').split('.')[1] || '',
    year: (dateString || '').split('.')[2] || ''
  };
};

const userDataSchema = ({ t, fields, customValidation }) => {
  const unverifiedFields = Object.keys(fields || {}).filter((key) => !fields[key]);

  const properties = {};

  if (unverifiedFields.includes('passport')) {
    properties.tabs = {
      type: 'object',
      control: 'tabs',
      emptyHidden: true,
      properties: {
        passport: {
          type: 'object',
          properties: {
            pasNumber: {
              description: '',
              control: 'form.group',
              properties: {
                series: {
                  type: 'string',
                  checkRequired:
                    "(value, step, documentData) => documentData?.tabs?.active === 'passport'",
                  mask: '**',
                  checkValid: [
                    {
                      isValid: '(value) => !value || value.length === 2',
                      errorText: t('PassportCardErrorText')
                    }
                  ]
                },
                number: {
                  type: 'string',
                  description: t('Number'),
                  mask: '999999',
                  checkRequired:
                    "(value, step, documentData) => documentData?.tabs?.active === 'passport'",
                  checkValid: [
                    {
                      isValid:
                        '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } return !value || value.length === 6; }',
                      errorText: t('PassportCardErrorText1')
                    }
                  ]
                }
              },
              required: []
            },
            issuedAt: {
              control: 'form.group',
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } const day = step.tabs.passport.issuedAt.day; const month = parseInt(step.tabs.passport.issuedAt.month) - 1; const year = step.tabs.passport.issuedAt.year; var birthDate = new Date(year, month, day).getTime(); var today = new Date().getTime(); return birthDate && (birthDate < today); }',
                  errorText: t('PassportIssueDateErrorText')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } return !(step && step.tabs && step.tabs.passport && step.tabs.passport.issuedAt && step.tabs.passport.issuedAt.year &&  Number(step.tabs.passport.issuedAt.year) < 1994); }',
                  errorText: t('PassportIssueDateErrorText1')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } const day = step.tabs.passport.issuedAt.day; const month = parseInt(step.tabs.passport.issuedAt.month) - 1; const year = step.tabs.passport.issuedAt.year; var issueDate = new Date(year, month, day).getTime(); const bday = documentData.birthday.day; const bmonth = parseInt(documentData.birthday.month) -1; const byear = parseInt(documentData.birthday.year)+14; var today14 = new Date(byear, bmonth, bday).getTime(); return today14 && issueDate && (issueDate > today14); }',
                  errorText: t('PassportIssueDateErrorText2')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } const year = Number(step.tabs.passport.issuedAt.year);  const month = Number(step.tabs.passport.issuedAt.month);   const day = Number(step.tabs.passport.issuedAt.day); return !(day === 29 && month === 2 && year % 4 !== 0 );}',
                  errorText: t('PassportIssueDateErrorText3')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } const month = parseInt(step.tabs.passport.issuedAt.month); const day = Number(step.tabs.passport.issuedAt.day); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.indexOf(month) !== -1) countDaysInMonth = 29; if (_31daysMonth.indexOf(month) !== -1) countDaysInMonth = 31;if (day > countDaysInMonth)  return false;return true; }',
                  errorText: t('PassportIssueDateErrorText4')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } const year = step.tabs.passport.issuedAt.year; return year <= "2018"}',
                  errorText: t('PassportIssueDateErrorText5')
                }
              ],
              properties: {
                day: {
                  type: 'string',
                  pattern: '^0*([1-9]|[12][0-9]|3[01])$',
                  mask: '99',
                  checkRequired:
                    "(value, step, documentData) => documentData?.tabs?.active === 'passport'"
                },
                month: {
                  type: 'string',
                  checkRequired:
                    "(value, step, documentData) => documentData?.tabs?.active === 'passport'"
                },
                year: {
                  type: 'string',
                  checkRequired:
                    "(value, step, documentData) => documentData?.tabs?.active === 'passport'",
                  pattern: '[0-9]{4}'
                }
              },
              required: []
            },
            issuedBy: {
              type: 'string',
              checkRequired:
                "(value, step, documentData) => documentData?.tabs?.active === 'passport'",
              maxLength: 255,
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "passport") { return true; } return !value || value.length > 9; }',
                  errorText: t('PassportIssuedByErrorText')
                },
                {
                  isValid:
                    "(value) => /^[-''',.№\" АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя0-9]+$/.test(value)",
                  errorText: t('BuildingErrorText')
                },
                {
                  isValid:
                    '(value, step, document, parent) => value && !/[-]{2,}/.test(value) && !/[ ]{2,}/.test(value) ',
                  errorText: t('PassportIssuedByErrorText2')
                }
              ]
            }
          }
        },
        idCard: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              checkRequired:
                "(value, step, documentData) => documentData?.tabs?.active === 'idCard'",
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "idCard") { return true; } return (!value || value.length === 9); }',
                  errorText: t('IdCardErrorText')
                }
              ]
            },
            issuedAt: {
              control: 'form.group',
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "idCard") { return true; } const day = step.tabs.idCard.issuedAt.day; const month = parseInt(step.tabs.idCard.issuedAt.month) - 1; const year = step.tabs.idCard.issuedAt.year; var birthDate = new Date(year, month, day).getTime(); var today = new Date().getTime(); return birthDate && (birthDate < today); }',
                  errorText: t('idCardIssueDateErrorText')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "idCard") { return true; } return !(step?.tabs?.idCard?.issuedAt?.year < 2016); }',
                  errorText: t('idCardIssueDateErrorText1')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "idCard") { return true; } const day = step.tabs.idCard.issuedAt.day; const month = parseInt(step.tabs.idCard.issuedAt.month) - 1; const year = step.tabs.idCard.issuedAt.year; var issueDate = new Date(year, month, day).getTime(); const bday = documentData.birthday.day; const bmonth = parseInt(documentData.birthday.month) -1; const byear = parseInt(documentData.birthday.year)+14; var today14 = new Date(byear, bmonth, bday).getTime(); return today14 && issueDate && (issueDate > today14); }',
                  errorText: t('idCardIssueDateErrorText2')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "idCard") { return true; } const year = Number(step.tabs.idCard.issuedAt.year);  const month = Number(step.tabs.idCard.issuedAt.month);   const day = Number(step.tabs.idCard.issuedAt.day);   return !(day === 29 && month === 2 && year % 4 !== 0 );}',
                  errorText: t('idCardIssueDateErrorText3')
                },
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "idCard") { return true; } const month = parseInt(step.tabs.idCard.issuedAt.month); const day = Number(step.tabs.idCard.issuedAt.day); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.indexOf(month) !== -1) countDaysInMonth = 29; if (_31daysMonth.indexOf(month) !== -1) countDaysInMonth = 31;if (day > countDaysInMonth)  return false;return true; }',
                  errorText: t('idCardIssueDateErrorText4')
                }
              ],
              properties: {
                day: {
                  type: 'string',
                  pattern: '^0*([1-9]|[12][0-9]|3[01])$',
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'idCard'); }",
                  mask: '99'
                },
                month: {
                  type: 'string',
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'idCard'); }"
                },
                year: {
                  type: 'string',
                  pattern: '[0-9]{4}',
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'idCard'); }"
                }
              },
              required: []
            },
            expireDate: {
              control: 'form.group',
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { const day = step.tabs.idCard.expireDate.day; const month = parseInt(step.tabs.idCard.expireDate.month) - 1; const year = step.tabs.idCard.expireDate.year; var birthDate = new Date(year, month, day).getTime(); var today = new Date().getTime(); return birthDate && (birthDate > today); }',
                  errorText: t('idCardExpiryDateErrorText')
                },
                {
                  isValid:
                    '(value, step, documentData) => {const month = parseInt(step.tabs.idCard.expireDate.month); const day = Number(step.tabs.idCard.expireDate.day); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.indexOf(month) !== -1) countDaysInMonth = 29; if (_31daysMonth.indexOf(month) !== -1) countDaysInMonth = 31;if (day > countDaysInMonth)  return false;return true; }',
                  errorText: t('idCardExpiryDateErrorText1')
                },
                {
                  isValid:
                    '(value, step, documentData) => { const year = Number(step.tabs.idCard.expireDate.year);  const month = Number(step.tabs.idCard.expireDate.month);   const day = Number(step.tabs.idCard.expireDate.day);   return !(day === 29 && month === 2 && year % 4 !== 0 );}',
                  errorText: t('idCardExpiryDateErrorText2')
                }
              ],
              properties: {
                day: {
                  type: 'string',
                  pattern: '^0*([1-9]|[12][0-9]|3[01])$',
                  maxLength: 2,
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'idCard'); }"
                },
                month: {
                  type: 'string',
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'idCard'); }"
                },
                year: {
                  type: 'string',
                  pattern: '[0-9]{4}',
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'idCard'); }"
                }
              }
            },
            issuedBy: {
              type: 'string',
              checkRequired:
                "(value, step, documentData) => documentData?.tabs?.active === 'idCard';",
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "idCard") { return true; } return !value || value.length === 4;}',
                  errorText: t('idCardIssuedByErrorText')
                }
              ]
            }
          }
        },
        foreignersDocument: {
          type: 'object',
          properties: {
            documentType: {
              type: 'object',
              control: 'register',
              checkRequired:
                "(value, step, documentData) => documentData?.tabs?.active === 'foreignersDocument'"
            },
            series: {
              type: 'string',
              checkRequired:
                "(value, step, documentData) => { if ((!!documentData?.tabs?.foreignersDocument?.documentType && documentData?.tabs?.foreignersDocument?.documentType?.code === '2' || documentData?.tabs?.foreignersDocument?.documentType?.code === '4') && documentData.tabs.active === 'foreignersDocument') return true; return false; }",
              maxLength: 2,
              checkValid: [
                {
                  isValid: '(value) => !value || value.length === 2',
                  errorText: t('foreignersDocumentSeriesErrorText')
                },
                {
                  isValid: '(value) => /^[а-яА-ЯЁёєЄіІїЇґҐa-zA-Z]{2}$/.test(value)',
                  errorText: t('foreignersDocumentSeriesErrorText1')
                }
              ]
            },
            number: {
              type: 'string',
              checkRequired:
                "(value, step, documentData) => documentData?.tabs?.active === 'foreignersDocument'",
              checkValid: [
                {
                  isValid:
                    "(value, stepValue, documentValue) => {if ((stepValue?.tabs?.foreignersDocument?.documentType?.code === '1' || stepValue?.tabs?.foreignersDocument?.documentType?.code === '3') && value && value.length !== 9) return false; return true;}",
                  errorText: t('foreignersDocumentNumberErrorText')
                },
                {
                  isValid:
                    "(value, stepValue, documentValue) => {if ((stepValue?.tabs?.foreignersDocument?.documentType?.code === '2' || stepValue?.tabs?.foreignersDocument?.documentType?.code === '4') && value && value.length !== 6) return false; return true;}",
                  errorText: t('foreignersDocumentNumberErrorText1')
                },
                {
                  isValid:
                    "(value, stepValue, documentValue) => {if ((stepValue?.tabs?.foreignersDocument?.documentType?.code === '1') && value && value[0] !== '8') return false; return true;}",
                  errorText: t('foreignersDocumentNumberErrorText2')
                },
                {
                  isValid:
                    "(value, stepValue, documentValue) => {if ((stepValue?.tabs?.foreignersDocument?.documentType?.code === '3') && value && value[0] !== '9') return false; return true;}",
                  errorText: t('foreignersDocumentNumberErrorText3')
                }
              ]
            },
            issuedAt: {
              control: 'form.group',
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => {  const day = step.tabs.foreignersDocument.issuedAt.day; const month = parseInt(step.tabs.foreignersDocument.issuedAt.month) - 1; const year = step.tabs.foreignersDocument.issuedAt.year; var issueDate = new Date(year, month, day).getTime(); var today = new Date().getTime(); return issueDate && (issueDate < today); }',
                  errorText: t('foreignersDocumentIssueDateErrorText')
                },
                {
                  isValid:
                    "(value, step, documentData) => { if (documentData?.tabs?.active !== 'foreignersDocument') { return true; } if (step?.tabs?.foreignersDocument?.documentType?.code === '2' || step?.tabs?.foreignersDocument?.documentType?.code === '4') return true; const day = step.tabs.foreignersDocument.issuedAt.day; const month = parseInt(step.tabs.foreignersDocument.issuedAt.month) - 1; const year = step.tabs.foreignersDocument.issuedAt.year; var issueDate = new Date(year, month, day).getTime(); var year2018 = new Date(2018, 0, 1).getTime(); return year2018 && issueDate && (issueDate >= year2018); }",
                  errorText: t('foreignersDocumentIssueDateErrorText')
                },
                {
                  isValid:
                    '({day, month}, step, documentData) => { if (documentData?.tabs?.active !== "foreignersDocument") { return true; } const dayNum = Number(day); const monthNum = Number(month); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.includes(monthNum)) countDaysInMonth = 29; if (_31daysMonth.includes(monthNum)) countDaysInMonth = 31; return day && (day <= countDaysInMonth)}',
                  errorText: t('foreignersDocumentIssueDateErrorText')
                },
                {
                  isValid:
                    '({day, month, year}, step, documentData) => { if (documentData?.tabs?.active !== "foreignersDocument") { return true; } const yearNum = Number(year); const monthNum = Number(month); const dayNum = Number(day); return dayNum && monthNum && yearNum && !(dayNum === 29 && monthNum === 2 && yearNum % 4 !== 0 );}',
                  errorText: t('foreignersDocumentIssueDateErrorText')
                }
              ],
              properties: {
                day: {
                  type: 'string',
                  pattern: '^0*([1-9]|[12][0-9]|3[01])$',
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'foreignersDocument'); }"
                },
                month: {
                  type: 'string',
                  description: t('month'),
                  width: 200,
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'foreignersDocument'); }"
                },
                year: {
                  type: 'string',
                  pattern: '([1-2]\\d{3})',
                  checkRequired:
                    "(value, step, documentData) => { return !(documentData?.tabs?.active !== 'foreignersDocument'); }"
                }
              },
              required: []
            },
            expireDate: {
              control: 'form.group',
              checkHidden:
                "(value, step, documentData) => {if (!!documentData?.tabs?.foreignersDocument?.documentType && documentData?.tabs?.foreignersDocument?.documentType?.code !== '4') return false; return true;}",
              cleanWhenHidden: true,
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { const day = step.tabs.foreignersDocument.expireDate.day; const month = parseInt(step.tabs.foreignersDocument.expireDate.month) - 1; const year = step.tabs.foreignersDocument.expireDate.year; var expireDate = new Date(year, month, day).getTime(); var today = new Date().getTime(); return expireDate && (expireDate >= today); }',
                  errorText: t('foreignersDocumentExpireDateErrorText')
                },
                {
                  isValid:
                    '({ day, month }) => { const dayNum = Number(day); const monthNum = Number(month); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.includes(monthNum)) countDaysInMonth = 29; if (_31daysMonth.includes(monthNum)) countDaysInMonth = 31; return day && (day <= countDaysInMonth)}',
                  errorText: t('foreignersDocumentExpireDateErrorText1')
                },
                {
                  isValid:
                    '({ day, month, year }) => { const yearNum = Number(year); const monthNum = Number(month); const dayNum = Number(day); return dayNum && monthNum && yearNum && !(dayNum === 29 && monthNum === 2 && yearNum % 4 !== 0 );}',
                  errorText: t('foreignersDocumentExpireDateErrorText2')
                }
              ],
              properties: {
                day: {
                  type: 'string',
                  pattern: '^0*([1-9]|[12][0-9]|3[01])$',
                  checkRequired:
                    "(value, step, documentData) => { return (documentData?.tabs?.foreignersDocument?.documentType?.code !== '4') && documentData.tabs.active === 'foreignersDocument'; }"
                },
                month: {
                  type: 'string',
                  checkRequired:
                    "(value, step, documentData) => { return (documentData?.tabs?.foreignersDocument?.documentType?.code !== '4') && documentData.tabs.active === 'foreignersDocument'; }"
                },
                year: {
                  type: 'string',
                  pattern: '([1-2]\\d{3})',
                  checkRequired:
                    "(value, step, documentData) => { return (documentData?.tabs?.foreignersDocument?.documentType?.code !== '4') && documentData.tabs.active === 'foreignersDocument'; }"
                }
              },
              required: []
            },
            issuedBy: {
              type: 'string',
              checkRequired:
                "(value, step, documentData) => documentData?.tabs?.active === 'foreignersDocument'",
              checkValid: [
                {
                  isValid:
                    '(value, step, documentData) => { if (documentData?.tabs?.active !== "foreignersDocument") { return true; } return !value || value.length === 4;}',
                  errorText: t('idCardIssuedByErrorText')
                }
              ]
            }
          }
        }
      }
    };
  }

  if (unverifiedFields.includes('address')) {
    properties.address = {
      type: 'object',
      control: 'register',
      allVisibleRequired: true,
      properties: {
        region: {
          keyId: 408
        },
        district: {
          keyId: 410
        },
        city: {
          keyId: 411
        }
      },
      required: ['region']
    };

    properties.street = {
      type: 'object',
      checkRequired: '() => true'
    };

    properties.apartment = {
      type: 'object',
      properties: {
        apartment: {
          type: 'string',
          checkRequired: '(value, step, data) => !data?.isPrivateHouse',
          pattern: '^[А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9-—().,/\\\\ ]+$',
          maxLength: 20,
          checkValid: [
            {
              isValid: '(value) => /^[А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9-—().,/\\\\ ]+$/.test(value)',
              errorText: t('BuildingErrorText')
            }
          ]
        }
      }
    };

    properties.building = {
      type: 'object',
      properties: {
        building: {
          type: 'string',
          checkRequired: '() => true',
          pattern: '^[А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9-—().,/\\\\ ]+$',
          maxLength: 20,
          checkValid: [
            {
              isValid: '(value) => /^[А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9-—().,/\\\\ ]+$/.test(value)',
              errorText: t('BuildingErrorText')
            }
          ]
        },
        korp: {
          type: 'string',
          pattern: '^[А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9-—().,/\\\\ ]+$',
          maxLength: 20,
          checkValid: [
            {
              isValid: '(value) => /^[А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9-—().,/\\\\ ]+$/.test(value)',
              errorText: t('BuildingErrorText')
            }
          ]
        }
      }
    };
  }

  if (unverifiedFields.includes('index')) {
    properties.index = {
      type: 'string',
      checkRequired: '() => true',
      mask: '99999',
      maxLength: 5,
      pattern: '[0-9]{5}',
      checkValid: [
        {
          isValid: '(value, step, data) => value && value.length === 5',
          errorText: t('IndexFieldErrorText')
        },
        {
          isValid: '(value, step, data) => value !== "00000"',
          errorText: t('IndexFieldErrorText1')
        },
        {
          isValid: '(_, { checkIndex }) => checkIndex !== "invalid"',
          errorText: ''
        }
      ]
    };
  }

  if (unverifiedFields.includes('birthday')) {
    properties.birthday = {
      checkValid: [
        {
          isValid:
            '(value, step, documentData) => { const day = Number(value.day); const month = Number(value.month) - 1; const year = value.year; var birthDate = new Date(year, month, day).getTime(); var today = new Date().getTime(); return (birthDate < today); }',
          errorText: t('birthDateErrorText')
        },
        {
          isValid:
            '(value, step, documentData) => {const month = parseInt(value.month); const day = Number(value.day); const _29daysMonth = [2]; const _31daysMonth = [1, 3, 5, 7, 8, 10, 12 ]; let countDaysInMonth = 30; if (_29daysMonth.indexOf(month) !== -1) countDaysInMonth = 29; if (_31daysMonth.indexOf(month) !== -1) countDaysInMonth = 31;if (day > countDaysInMonth)  return false;return true; }',
          errorText: t('birthDateErrorText1')
        },
        {
          isValid:
            '(value, step, documentData) => { const year = Number(value.year);  const month = Number(value.month);   const day = Number(value.day);   return !(day === 29 && month === 2 && year % 4 !== 0 );}',
          errorText: t('birthDateErrorText2')
        },
        {
          isValid:
            '(value, step, documentData) => { const year = Number(value.year);  const month = Number(value.month) - 1;   const day = Number(value.day);  var birthDate = new Date(year, month, day).getTime();  var today = new Date(); today.setFullYear( today.getFullYear() - 14 ); var today14 = today.getTime(); return today14 && birthDate && (today14 > birthDate); }',
          errorText: t('birthDateErrorText3')
        },
        {
          isValid:
            '(value, step, documentData) => { const passportYear = Number(step && step.tabs && step.tabs.passport && step.tabs.passport.issuedAt && step.tabs.passport.issuedAt.year) - 14; const passportMonth = Number(step && step.tabs && step.tabs.passport && step.tabs.passport.issuedAt && step.tabs.passport.issuedAt.month) - 1; const passportDay = step && step.tabs && step.tabs.passport && step.tabs.passport.issuedAt && step.tabs.passport.issuedAt.day; const idCardYear = Number(step && step.tabs && step.tabs.idCard && step.tabs.idCard.issuedAt && step.tabs.idCard.issuedAt.year) - 14;  const idCardMonth = Number(step && step.tabs && step.tabs.idCard && step.tabs.idCard.issuedAt && step.tabs.idCard.issuedAt.month) - 1; const idCardDay = step && step.tabs && step.tabs.idCard && step.tabs.idCard.issuedAt && step.tabs.idCard.issuedAt.day; const foreignersDocumentYear = Number(step?.tabs?.foreignersDocument?.issuedAt?.year) - 14; const foreignersDocumentMonth = Number(step?.tabs?.foreignersDocument?.issuedAt?.month) - 1; const foreignersDocumentDay = step?.tabs?.foreignersDocument?.issuedAt?.day; const year = Number(value.year);  const month = Number(value.month) - 1;   const day = Number(value.day); var passportDate = new Date(passportYear, passportMonth, passportDay).getTime(); var idCardDate = new Date(idCardYear, idCardMonth, idCardDay).getTime(); var foreignersDate = new Date(foreignersDocumentYear, foreignersDocumentMonth, foreignersDocumentDay).getTime();  var birthDate = new Date(year, month, day).getTime(); if (!passportDate && !idCardDate && !foreignersDate) return true; return (passportDate || idCardDate || foreignersDate) >= birthDate }',
          errorText: t('birthDateErrorText4')
        }
      ],
      properties: {
        day: {
          type: 'string',
          checkRequired: '() => true',
          pattern: '^0*([1-9]|[12][0-9]|3[01])$',
          mask: '99'
        },
        month: {
          type: 'string',
          checkRequired: '() => true'
        },
        year: {
          type: 'string',
          checkRequired: '() => true',
          pattern: '[0-9]{4}',
          checkValid: [
            {
              isValid:
                '(value, stepValue, documentValue) => { if (!value) { return true; } return value > 1900}',
              errorText: t('birthDateErrorText5')
            }
          ]
        }
      }
    };
  }

  if (unverifiedFields.includes('birthdayPlace')) {
    properties.birthdayPlace = {
      type: 'string',
      checkRequired: '() => true'
    };
  }

  if (unverifiedFields.includes('birthdayCountry')) {
    properties.birthdayCountry = {
      type: 'object',
      checkRequired: '() => true'
    };
  }

  if (unverifiedFields.includes('gender')) {
    properties.gender = {
      type: 'string',
      checkRequired: '() => true',
      checkValid: [
        {
          isValid: '(value) => value && value.value && value.value !== "0"',
          errorText: t('chooseGender')
        }
      ]
    };
  }

  if (unverifiedFields.includes('email')) {
    properties.email = {
      type: 'string',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]+$',
      checkRequired: '() => true',
      checkValid: [
        {
          isValid:
            "(value) => value && (value.toLowerCase().search('@mail.ru') == -1 && value.toLowerCase().search('@yandex.ru') == -1 && value.toLowerCase().search('@yandex.ua') == -1 && value.toLowerCase().search('@ya.ru') == -1 && value.toLowerCase().search('@ya.ua') == -1 && value.toLowerCase().search('@mail.ua') == -1 && value.toLowerCase().search('@bk.ru') == -1 && value.toLowerCase().search('@list.ru') == -1 && value.toLowerCase().search('@inbox.ru') == -1)",
          errorText: t('userDataEmailError')
        }
      ]
    };
  }

  if (unverifiedFields.includes('phone')) {
    properties.phone = {
      type: 'string',
      pattern: '^380[0-9]{9}$',
      checkRequired: '() => true'
    };
  }

  if (unverifiedFields.includes('unzr')) {
    properties.unzr = {
      type: 'string',
      checkRequired: '(value, step, data) => !data?.isNoUnzr',
      checkValid: [
        {
          isValid:
            '(value) => {if (!!value) return value && value.length && value.length === 14;return true};',
          errorText: t('unzrError2')
        },
        {
          isValid:
            "(value, stepValue, documentValue) => {if (!!value) {const unzrnumber = value && value.replace('-', '').split(''); const e1 = unzrnumber && unzrnumber[0] * 7;const e2 = unzrnumber && unzrnumber[1] * 3;const e3 = unzrnumber && unzrnumber[2] * 1;const e4 = unzrnumber && unzrnumber[3] * 7;const e5 = unzrnumber && unzrnumber[4] * 3;const e6 = unzrnumber && unzrnumber[5] * 1;const e7 = unzrnumber && unzrnumber[6] * 7;const e8 = unzrnumber && unzrnumber[7] * 3;const e9 = unzrnumber && unzrnumber[8] * 1;const e10 = unzrnumber && unzrnumber[9] * 7;const e11 = unzrnumber && unzrnumber[10] * 3;const e12 = unzrnumber && unzrnumber[11] * 1;const control = unzrnumber && unzrnumber[12];const e_sum = e1 + e2 + e3 + e4 + e5 + e6 + e7 + e8 + e9 + e10 + e11 + e12;const e_control = e_sum % 10;if (e_control == control) {return true} else {return false}}return true};",
          errorText: t('unzrError1')
        }
      ]
    };
  }

  if (unverifiedFields.includes('citizenship')) {
    properties.citizenship = {
      type: 'object',
      checkRequired: '() => true'
    };
  }

  customValidation &&
    Object.keys(properties).forEach((prop) => {
      if (['apartment', 'building'].includes(prop) && customValidation.address) {
        Object.keys(properties[prop]['properties']).forEach((key) => {
          if (customValidation.address[key]) {
            properties[prop]['properties'][key]['checkValid'] =
              customValidation.address[key]['checkValid'];
          }
        });
      }
    });

  return {
    type: 'object',
    properties
  };
};

const calculatedFields = (schema = {}, rootDocument = {}, verifiedData = {}) => {
  const calculatedVerifiedFields = {};
  let fields = schema.fields;
  const calculateFieldsFunc = schema?.calculateFields || null;
  if (calculateFieldsFunc) {
    let calculateFields = evaluate(calculateFieldsFunc, rootDocument.data);
    if (calculateFields instanceof Error) {
      calculateFields = schema.fields;
    }
    fields = calculateFields;
  }

  fields.forEach((field) => {
    calculatedVerifiedFields[field] = verifiedData[field];
  });

  return {
    ...calculatedVerifiedFields
  };
};

const mappedUserData = (userData) =>
  removeEmptyFields({
    verified: userData?.verified,
    address: {
      region: userData?.address?.region,
      district: userData?.address?.district,
      city: userData?.address?.city,
      propertiesHasOptions: userData?.address?.propertiesHasOptions
    },
    street: userData?.address?.street,
    apartment: {
      apartment: userData?.address?.apartment?.value
    },
    index: userData?.index?.value,
    checkIndex: userData?.checkIndex,
    building: {
      building: userData?.address?.building?.value,
      korp: userData?.address?.korp?.value
    },
    isPrivateHouse: userData?.address?.isPrivateHouse,
    birthday: parseDate(userData?.birthday?.date),
    birthdayPlace: userData?.birthday?.place,
    birthdayCountry: userData?.birthday?.countryRecord?.value,
    email: userData?.email?.value,
    phone: userData?.phone?.value,
    unzr: userData?.unzr?.value,
    isNoUnzr: userData?.unzr?.isNoUnzr,
    gender: userData?.gender?.value,
    citizenship: userData?.citizenship?.value,
    tabs: {
      active: userData?.passport?.type || 'passport',
      passport: {
        pasNumber: {
          series: userData?.passport?.series,
          number: userData?.passport?.number
        },
        issuedAt: parseDate(userData?.passport?.issuedAt),
        issuedBy: userData?.passport?.issuedBy
      },
      idCard: {
        number: userData?.passport?.number,
        issuedAt: parseDate(userData?.passport?.issuedAt),
        expireDate: parseDate(userData?.passport?.expireDate),
        issuedBy: userData?.passport?.issuedBy
      },
      foreignersDocument: {
        expireDate: parseDate(userData?.passport?.expireDate),
        issuedAt: parseDate(userData?.passport?.issuedAt),
        issuedBy: userData?.passport?.issuedBy,
        number: userData?.passport?.number,
        series: userData?.passport?.series,
        documentType: userData?.passport?.documentType
      }
    }
  });

const findAllControlPaths = (obj, controlName) => {
  let paths = [];

  const findControl = (obj, currentPath = '') => {
    if (obj !== null && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (value?.control === controlName) {
          paths.push(newPath);
        } else if (typeof value === 'object') {
          findControl(value, newPath);
        }
      }
    }
  };

  findControl(obj);
  return paths;
};

export default async function validateUserData(validateStepId) {
  const { t, userInfo } = this.props;
  const {
    task,
    stepId,
    steps,
    template: {
      jsonSchema: { properties }
    }
  } = propsToData(this.props);

  const controlPaths = findAllControlPaths(properties, 'verifiedUserInfo');
  let concatErrors = [];

  const checkFunction = async (selectFilesPath) => {
    if (!selectFilesPath) return;

    if (!selectFilesPath.includes(validateStepId || stepId)) return;

    const schemaPath = selectFilesPath.replace('.control', '');

    const path = schemaPath.replace('.properties', '');

    const userData = mappedUserData(objectPath.get(task.document.data, path));

    const schema = objectPath.get(properties, schemaPath);

    const { hiddenFields = [], fields = [], hiddenIsValid } = schema;

    userData.verified = calculatedFields(schema, task?.document, userData.verified);

    if (hiddenIsValid) {
      const isHidden = await checkIsHidden({
        value: userData,
        steps,
        activeStep: stepId,
        parentValue: task?.document?.data[stepId],
        rootDocument: task?.document,
        userInfo,
        schema
      });

      if (isHidden) {
        return;
      }
    }

    const citizenShipExists = ['idCard', 'passport'].includes(userData?.tabs?.active);

    if (!citizenShipExists) {
      objectPath.set(userData.verified, 'citizenship', false);
    }

    if (
      fields?.includes('birthday') &&
      !hiddenFields.includes('birthday.place') &&
      !userData.verified.birthday
    ) {
      objectPath.set(userData.verified, 'birthdayPlace', false);
    } else {
      objectPath.del(userData.verified, 'birthdayPlace');
    }

    if (
      fields?.includes('birthday') &&
      !hiddenFields.includes('birthday.country') &&
      !userData.verified.birthday
    ) {
      objectPath.set(userData.verified, 'birthdayCountry', false);
    } else {
      objectPath.del(userData.verified, 'birthdayCountry');
    }
    const stateValidationErrors = this.state.validationErrors;

    const validationErrors =
      (await validateDataAsync(
        userData,
        userDataSchema({
          t,
          fields: userData?.verified,
          customValidation: schema?.customValidation
        }),
        userData
      )) || [];

    const concat = validationErrors
      .map((error) => ({
        ...error,
        dataPath: `${error.dataPath}`
      }))
      .concat(stateValidationErrors);

    concatErrors = concatErrors.concat(concat);

    console.log('validationErrors', concatErrors);

    this.setState({ validationErrors: concatErrors }, () =>
      this.scrollToInvalidField(concatErrors)
    );
  };

  for (const selectFilesPath of controlPaths) {
    await checkFunction(selectFilesPath);
  }

  return !Object.keys(concatErrors).length;
}
