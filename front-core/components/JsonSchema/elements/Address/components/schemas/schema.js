export default ({ required }) => ({
  type: 'object',
  properties: {
    ATU: {
      type: 'object',
      control: 'register',
      multiple: false,
      allVisibleRequired: required,
      cleanWhenHidden: true,
      properties: {
        region: {
          keyId: 408,
          description: 'Область, м. Київ або м. Севастополь',
        },
        district: {
          keyId: 410,
          description: 'Місто або район',
          sample:
            "<div style='background: #FFF4D7; padding: 10px 15px 10px 15px'>Назва має бути актуальною (враховуючи перейменування)</div>",
        },
        city: {
          keyId: 411,
          description: 'Село, селище, район міста',
          sample:
            "<div style='background: #FFF4D7; padding: 10px 15px 10px 15px'>Назва має бути актуальною (враховуючи перейменування)</div>",
        },
      },
      checkRequired: '(value, step, document, parent) => parent.required',
      checkHidden: '(value, step, document, parent) => parent.hidden',
    },
    street: {
      cleanWhenHidden: true,
      checkRequired: '(value, step, document, parent) => parent.required',
      checkHidden: '(value, step, document, parent) => parent.hidden',
    },
    building: {
      type: 'string',
      description: 'Будинок',
      cleanWhenHidden: true,
      checkValid: [
        {
          isValid:
            '(value, step, document, parent) => value && value.length <= 10',
          errorText: 'Може містити не більше, ніж 10 символів',
        },
        {
          isValid:
            '(value, step, document, parent) => value && !/[-]{2,}/.test(value) && !/[ ]{2,}/.test(value) ',
          errorText: 'Не може містити більше одного дефісу чи пробілу підряд',
        },
      ],
      checkRequired:
        '(value, step, document, parent, propertySchema, parentSchema) => parent.required',
      checkHidden: '(value, step, document, parent) => parent.hidden',
    },
    korpus: {
      type: 'string',
      description: 'Корпус',
      cleanWhenHidden: true,
      checkValid: [
        {
          isValid:
            '(value, step, document, parent) => value && value.length <= 10',
          errorText: 'Може містити не більше, ніж 10 символів',
        },
        {
          isValid:
            '(value, step, document, parent) => value && !/[-]{2,}/.test(value) && !/[ ]{2,}/.test(value) ',
          errorText: 'Не може містити більше одного дефісу чи пробілу підряд',
        },
      ],
      checkHidden:
        "(value, step, document, parent) => (parent && parent.isPrivateHouse && parent.isPrivateHouse[0] === 'приватний будинок') || parent.hidden",
    },
    isPrivateHouse: {
      type: 'array',
      control: 'checkbox.group',
      width: '50%',
      secondary: true,
      rowDirection: true,
      cleanWhenHidden: true,
      withIndex: false,
      items: [
        {
          id: 'приватний будинок',
          title: 'приватний будинок',
        },
      ],
      checkHidden: '(value, step, document, parent) => parent.hidden',
    },
    apt: {
      type: 'string',
      description: 'Номер квартири',
      cleanWhenHidden: true,
      checkValid: [
        {
          isValid:
            '(value, step, document, parent) => value && value.length <= 10',
          errorText: 'Може містити не більше, ніж 10 символів',
        },
        {
          isValid:
            '(value, step, document, parent) => value && !/[-]{2,}/.test(value) && !/[ ]{2,}/.test(value) ',
          errorText: 'Не може містити більше одного дефісу чи пробілу підряд',
        },
      ],
      checkRequired:
        "(value, step, document, parent) => !(parent && parent.isPrivateHouse && parent.isPrivateHouse[0] === 'приватний будинок') && parent.required",
      checkHidden:
        "(value, step, document, parent) => (parent && parent.isPrivateHouse && parent.isPrivateHouse[0] === 'приватний будинок') || parent.hidden",
    },
    index: {
      type: 'string',
      description: 'Індекс',
      mask: '99999',
      cleanWhenHidden: true,
      sample:
        "<div style='display: inline-flex; background: #FFF4D7; padding: 10px 15px 10px 15px'><a href='https://index.ukrposhta.ua/find-post-index' target='_blank' style='color:#000000;'>Дізнатись свій індекс</a></div></div>",
      checkValid: [
        {
          isValid: '(value, step, document) => value && value.length === 5',
          errorText: 'Має містити 5 цифр',
        },
      ],
      checkHidden: '(value, step, document, parent) => parent.hidden',
      checkRequired: '(value, step, document, parent) => parent.required',
    },
  },
});
