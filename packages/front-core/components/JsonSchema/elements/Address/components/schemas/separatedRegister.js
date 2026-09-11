import theme from 'theme';

const calcTriggers = ({ stepName, isArray, isPopup }) => {
  const isArrayOrPopup = isArray || isPopup;
  const commonTriggers = [
    {
      source: `${stepName}.building.index`,
      target: `${stepName}.apt.index`,
      calculate: '(val) => val',
    },
    {
      source: `${stepName}.apt.index`,
      target: `${stepName}.building.index`,
      calculate: '(val) => val',
    },
  ];

  if (isArrayOrPopup) {
    return [
      ...commonTriggers,
      {
        source: `${stepName}.region`,
        target: `${stepName}.district`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.region`,
        target: `${stepName}.city`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.region`,
        target: `${stepName}.street`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.district`,
        target: `${stepName}.city`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.district`,
        target: `${stepName}.street`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.city`,
        target: `${stepName}.street`,
        calculate: '() => undefined',
      },
    ];
  } else {
    return [
      {
        source: `${stepName}.ATU`,
        target: `${stepName}.street`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.region`,
        target: `${stepName}.district`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.region`,
        target: `${stepName}.city`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.region`,
        target: `${stepName}.street`,
        calculate: '() => undefined',
      },
    ];
  }
};

const defaultSchema = ({
  stepName,
  withNamedObjects,
  allVisibleStreet,
  recordsTree,
  hidden,
  isArray,
  isPopup,
  indexHidden,
  hiddenFunction,
  requiredFunction,
}) => {
  const isArrayOrPopup = isArray || isPopup;
  let atu = {};
  let streetControl = {};
  const path = isArrayOrPopup ? 'data.' : `data.${stepName}.`;
  const listenedValuesForStreet = isArrayOrPopup ? '' : `${stepName}.`;
  const stepDetails = 'parentValue';
  const checkRequired = isArrayOrPopup && requiredFunction ? requiredFunction : `() => !${hidden}`;
  const checkHiddenRegion = isArrayOrPopup
    ? '(a, b, c, parentValue) => { if (!parentValue?.region && !parentValue?.region?.atuId) {return true}; return false; }'
    : '(value, parentValue, document) => { if (!parentValue?.region && !parentValue?.region?.atuId) {return true}; return false; }';
  const checkHiddendCity = isArrayOrPopup
    ? '(a, b, c, parentValue) => { if (!parentValue?.district && !parentValue?.district?.atuId) {return true}; return false;}'
    : '(value, parentValue, document) => { if (!parentValue?.district && !parentValue?.district?.atuId) {return true}; return false;}';
  const checkHidden =
    isArrayOrPopup && hiddenFunction ? hiddenFunction : `() => ${hidden}`;
  const checkApt = `(a, b, c, parentValue) => { const house = !(parentValue && parentValue.isPrivateHouse && parentValue.isPrivateHouse[0] === 'приватний будинок'); if (!house) {return false} return !${hidden}}`;
  const checkHiddenStreet = isArrayOrPopup
    ? `(a, b, c, parentValue) =>{ if(${allVisibleStreet}) return false; if(parentValue?.district?.atuId && parentValue?.city === false) return false; if(parentValue?.district?.atuId && parentValue?.city !== false && parentValue?.city?.atuId) return false; return true;}`
    : recordsTree
    ? `(a, parentValue, c ) =>{ if (${hidden}) return true; if(${allVisibleStreet}) return false; if(parentValue?.ATU?.district?.atuId && parentValue?.ATU?.propertiesHasOptions?.city === false) return false; if(parentValue?.ATU?.district?.atuId && parentValue?.ATU?.propertiesHasOptions?.city !== false && parentValue?.ATU?.city?.atuId) return false; return true;}`
    : `(a, parentValue, c ) =>{ if (${hidden}) return true; if(${allVisibleStreet}) return false; if(parentValue?.district?.atuId && parentValue?.city === false) return false; if(parentValue?.district?.atuId && parentValue?.city !== false && parentValue?.city?.atuId) return false; return true;}`;
  switch (recordsTree) {
    case false: {
      atu = {
        region: {
          type: 'object',
          control: 'register',
          keyId: 408,
          description: 'Область або м. Київ',
          checkRequired: checkRequired,
          cleanWhenHidden: true,
          filtersFromSchema: true,
          checkHidden: checkHidden,
          indexedSort: {
            'sort[data.name]': 'asc',
          },
        },
        district: {
          type: 'object',
          control: 'register',
          keyId: 410,
          description: 'Населений пункт або район',
          checkRequired: checkRequired,
          markWhenEmpty: true,
          filtersFromSchema: true,
          cleanWhenHidden: true,
          address: true,
          controlInArray: isArrayOrPopup,
          forceInit: true,
          isPopup: isPopup && !isArray,
          controlInPopup: isPopup && !isArray,
          checkHidden: checkHiddenRegion,
          listenedValuesForRequest: [isArray ? 'region' : `${stepName}.region`],
          indexedSort: {
            'sort[data.name]': 'asc',
          },
          search: `(data, objectPath) => {const res = objectPath.get(data, '${
            isPopup ? '' : stepName
          }'); return res.region && res.region.atuId  || 'unknown'; }`,
        },
        city: {
          control: 'register',
          keyId: 411,
          description: 'Село, селище, район міста',
          checkRequired: checkRequired,
          markWhenEmpty: true,
          filtersFromSchema: true,
          cleanWhenHidden: true,
          forceInit: true,
          address: true,
          isPopup: isPopup && !isArray,
          controlInPopup: isPopup && !isArray,
          controlInArray: isArrayOrPopup,
          checkHidden: checkHiddendCity,
          listenedValuesForRequest: [
            isArray ? 'district' : `${stepName}.district`,
          ],
          indexedSort: {
            'sort[data.type]': 'asc',
          },
          search: `(data, objectPath) => {const res = objectPath.get(data, '${
            isPopup ? '' : stepName
          }'); return res.district && res.district.atuId  || 'unknown'; }`,
        },
      };
      break;
    }
    case true: {
      atu = {
        ATU: {
          type: 'object',
          control: 'register',
          cleanWhenHidden: true,
          allVisibleRequired: true,
          hidden: hidden,
          properties: {
            region: {
              keyId: 408,
              description: 'Область або м. Київ',
            },
            district: {
              keyId: 410,
              description: 'Місто або район',
            },
            city: {
              keyId: 411,
              description: 'Село, селище',
            },
          },
          required: [],
        },
      };
      break;
    }
    default: {
      break;
    }
  }

  const recordsTreeStreetSearch = `(data) => {
        const regionId = ${path}ATU?.region?.atuId;
        const districtId = ${path}ATU?.district?.atuId;
        const cityId = ${path}ATU?.city?.atuId;
        return [regionId, districtId, cityId].filter(Boolean).length ? [regionId, districtId, cityId].filter(Boolean) : 'unknown';
    }`;

  const streetSearch = `(data, objectPath) => {
        const res = objectPath.get(data, '${isPopup ? '' : stepName}');
        const regionId = res?.region?.atuId;
        const districtId = res?.district?.atuId;
        const cityId = res?.city?.atuId;
        return [regionId, districtId, cityId].filter(Boolean).length ? [regionId, districtId, cityId].filter(Boolean) : 'unknown';
    }`;

  const recordsTreeListened = [
    `${listenedValuesForStreet}ATU.region`,
    `${listenedValuesForStreet}ATU.district`,
    `${listenedValuesForStreet}ATU.city`,
  ];

  const listenedValuesForRequest = [
    `${listenedValuesForStreet}region`,
    `${listenedValuesForStreet}district`,
    `${listenedValuesForStreet}city`,
  ];

  switch (withNamedObjects) {
    case null: {
      streetControl = {
        control: 'form.group',
        blockDisplay: false,
        outlined: false,
        hidden: hidden,
        cleanWhenHidden: true,
        properties: {
          streetType: {
            type: 'string',
            width: '60%',
            description: 'Тип вулиці',
            options: [
              {
                id: 'вулиця',
                name: 'вулиця',
              },
              {
                id: 'провулок',
                name: 'провулок',
              },
              {
                id: 'площа',
                name: 'площа',
              },
              {
                id: 'проспект',
                name: 'проспект',
              },
              {
                id: 'бульвар',
                name: 'бульвар',
              },
              {
                id: 'тупік',
                name: 'тупік',
              },
              {
                id: 'узвіз',
                name: 'узвіз',
              },
              {
                id: 'набережна',
                name: 'набережна',
              },
              {
                id: 'шосе',
                name: 'шосе',
              },
              {
                id: 'мікрорайон',
                name: 'мікрорайон',
              },
              {
                id: 'житловий комплекс',
                name: 'житловий комплекс',
              },
              {
                id: 'жилий масив',
                name: 'жилий масив',
              },
              {
                id: 'проїзд',
                name: 'проїзд',
              },
              {
                id: 'майдан',
                name: 'майдан',
              },
              {
                id: 'квартал',
                name: 'квартал',
              },
              {
                id: "в'їзд",
                name: "в'їзд",
              },
              {
                id: 'інше',
                name: 'інше',
              },
            ],
          },
          streetName: {
            type: 'string',
            description: 'Назва вулиці',
            checkValid: [
              {
                isValid:
                  "(propertyValue, stepValue, documentValue) => /^[-'‘’\" /А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9]+$/.test(propertyValue)",
                errorText:
                  'Може містити тільки українські літери, цифри, дефіс, пробіл та лапки',
              },
              {
                isValid:
                  "(propertyValue, stepValue, documentValue) => propertyValue && propertyValue !== '-' && propertyValue !== '–' && propertyValue !== '—' && propertyValue !== '\\'' &&  propertyValue !== ' '",
                errorText: 'Має містити букви',
              },
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && !/[-]{2,}/.test(propertyValue) && !/[ ]{2,}/.test(propertyValue) ',
                errorText:
                  'Не може містити більше одного дефісу чи пробілу підряд',
              },
            ],
            checkRequired: checkRequired,
          },
        },
        required: ['streetType', 'streetName'],
      };
      break;
    }
    case true: {
      streetControl = {
        type: 'object',
        control: 'register',
        keyId: 450,
        description: 'Назва вулиці',
        filtersType: 'or',
        autocomplete: true,
        autocompleteField: 'name',
        cleanWhenHidden: true,
        markWhenEmpty: true,
        filtersFromSchema: true,
        checkRequired: checkRequired,
        checkHidden: checkHiddenStreet,
        allVisibleStreet: allVisibleStreet,
        isPopup: isPopup && !isArray,
        address: true,
        listenedValuesForRequest: recordsTree
          ? recordsTreeListened
          : listenedValuesForRequest,
        indexedSort: {
          'sort[data.name]': 'asc',
        },
        search: recordsTree ? recordsTreeStreetSearch : streetSearch,
      };
      break;
    }
    case false: {
      streetControl = {
        type: 'object',
        control: 'register',
        keyId: 412,
        description: 'Назва вулиці',
        filtersType: 'or',
        autocomplete: true,
        autocompleteField: 'name',
        cleanWhenHidden: true,
        markWhenEmpty: true,
        filtersFromSchema: true,
        forceInit: true,
        checkHidden: checkHiddenStreet,
        checkRequired: checkRequired,
        allVisibleStreet: allVisibleStreet,
        isPopup: isPopup && !isArray,
        address: true,
        listenedValuesForRequest: recordsTree
          ? recordsTreeListened
          : listenedValuesForRequest,
        indexedSort: {
          'sort[data.name]': 'asc',
        },
        search: recordsTree ? recordsTreeStreetSearch : streetSearch,
      };
      break;
    }
    default: {
      break;
    }
  }

  const backgroundColor = theme?.indexBg || '#FFF4D7';

  return {
    type: 'object',
    properties: {
      ...atu,
      street: streetControl,
      building: {
        control: 'form.group',
        blockDisplay: false,
        outlined: false,
        checkHidden: checkHidden,
        cleanWhenHidden: true,
        address: true,
        properties: {
          building: {
            type: 'string',
            checkRequired: checkRequired,
            description: 'Будинок',
            width: '50%',
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length <= 10',
                errorText: 'Може містити не більше, ніж 10 символів',
              },
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && !/[-]{2,}/.test(propertyValue) && !/[ ]{2,}/.test(propertyValue) ',
                errorText:
                  'Не може містити більше одного дефісу чи пробілу підряд',
              },
            ],
          },
          korpus: {
            type: 'string',
            description: 'Корпус',
            width: '50%',
            address: true,
            cleanWhenHidden: true,
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length <= 10',
                errorText: 'Може містити не більше, ніж 10 символів',
              },
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && !/[-]{2,}/.test(propertyValue) && !/[ ]{2,}/.test(propertyValue) ',
                errorText:
                  'Не може містити більше одного дефісу чи пробілу підряд',
              },
            ],
            checkHidden: '(propertyData, pageObject, allStepsData, parentValue) => { return (parentValue && parentValue.isPrivateHouse && parentValue.isPrivateHouse[0] === \'приватний будинок\')}',
          },
          index: {
            type: 'string',
            description: 'Індекс',
            address: true,
            checkRequired: `(propertyData, pageObject, allStepsData, parentValue) => { if (${hidden}) { return false; }  return (parentValue && parentValue.isPrivateHouse && parentValue.isPrivateHouse[0] === 'приватний будинок'); }`,
            sample: `<div style='display: inline-flex; background: ${backgroundColor}; padding: 10px 15px 10px 15px'><a href='https://index.ukrposhta.ua/find-post-index' target='_blank' style='color:#000000;'>Дізнатись свій індекс</a></div></div>`,
            width: '50%',
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 5',
                errorText: 'Має містити 5 цифр',
              },
            ],
            mask: '99999',
            checkHidden: `(propertyData, pageObject, allStepsData, parentValue) => { return  !(${stepDetails} && ${stepDetails}.isPrivateHouse && ${stepDetails}.isPrivateHouse[0] === 'приватний будинок')}`,
          },
        },
        required: [],
      },
      isPrivateHouse: {
        type: 'array',
        control: 'checkbox.group',
        width: '50%',
        secondary: true,
        withIndex: true,
        address: true,
        indexHidden,
        checkHidden: checkHidden,
        cleanWhenHidden: true,
        items: [
          {
            id: 'приватний будинок',
            title: 'приватний будинок',
          },
        ],
        rowDirection: true,
      },
      apt: {
        control: 'form.group',
        blockDisplay: false,
        outlined: false,
        checkHidden: checkHidden,
        cleanWhenHidden: true,
        properties: {
          apt: {
            type: 'string',
            description: 'Номер квартири',
            width: '50%',
            cleanWhenHidden: true,
            address: true,
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length <= 10',
                errorText: 'Може містити не більше, ніж 10 символів',
              },
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && !/[-]{2,}/.test(propertyValue) && !/[ ]{2,}/.test(propertyValue) ',
                errorText:
                  'Не може містити більше одного дефісу чи пробілу підряд',
              },
            ],
            checkHidden: `(propertyData, pageObject, allStepsData, parentValue) => { return (${stepDetails} && ${stepDetails}.isPrivateHouse && ${stepDetails}.isPrivateHouse[0] === 'приватний будинок')}`,
            checkRequired: isArray
              ? checkApt
              : `(propertyData, pageObject, allStepsData, parentValue) => { if (${hidden}) { return false; } return !(parentValue && parentValue.isPrivateHouse && parentValue.isPrivateHouse[0] === 'приватний будинок')}`,
          },
          index: {
            type: 'string',
            description: 'Індекс',
            address: true,
            width: '50%',
            checkRequired: isArray
              ? checkApt
              : `(value, pageObject, allStepsData, parentValue) => { if (${hidden}) { return false; } return !parentValue?.isPrivateHouse || parentValue?.isPrivateHouse[0] !== 'приватний будинок';}`,
            sample: `<div style='display: inline-flex; background: ${backgroundColor}; padding: 10px 15px 10px 15px'><a href='https://index.ukrposhta.ua/find-post-index' target='_blank' style='color:#000000;'>Дізнатись свій індекс</a></div></div>`,
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 5',
                errorText: 'Має містити 5 цифр',
              },
            ],
            mask: '99999',
            checkHidden: `(propertyData, pageObject, allStepsData, parentValue) => { return (${stepDetails} && ${stepDetails}.isPrivateHouse && ${stepDetails}.isPrivateHouse[0] === 'приватний будинок')}`,
          },
        },
        required: [],
      },
    },
  };
};

export { calcTriggers, defaultSchema };
