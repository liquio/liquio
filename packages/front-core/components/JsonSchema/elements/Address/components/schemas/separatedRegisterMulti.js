const calcTriggersMulti = ({
  stepName,
  isArray,
  addressName,
  isPopup,
}) => {
  const isArrayOrPopup = isArray || isPopup;
  const commonTriggers = [
    {
      source: `${stepName}.${addressName}Building.index`,
      target: `${stepName}.${addressName}Apt.index`,
      calculate: '(val) => val',
    },
    {
      source: `${stepName}.${addressName}Apt.index`,
      target: `${stepName}.${addressName}Building.index`,
      calculate: '(val) => val',
    },
  ];

  if (isArrayOrPopup) {
    return [
      ...commonTriggers,
      {
        source: `${stepName}.${addressName}Region`,
        target: `${stepName}.${addressName}District`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}Region`,
        target: `${stepName}.${addressName}City`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}Region`,
        target: `${stepName}.${addressName}Street`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}District`,
        target: `${stepName}.${addressName}City`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}District`,
        target: `${stepName}.${addressName}Street`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}City`,
        target: `${stepName}.${addressName}Street`,
        calculate: '() => undefined',
      },
    ];
  } else {
    return [
      {
        source: `${stepName}.${addressName}ATU`,
        target: `${stepName}.${addressName}Street`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}Region`,
        target: `${stepName}.${addressName}District`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}Region`,
        target: `${stepName}.${addressName}City`,
        calculate: '() => undefined',
      },
      {
        source: `${stepName}.${addressName}Region`,
        target: `${stepName}.${addressName}Street`,
        calculate: '() => undefined',
      },
    ];
  }
};

const defaultSchemaMulti = ({
  stepName,
  withNamedObjects,
  allVisibleStreet,
  recordsTree,
  hidden,
  isArray,
  isPopup,
  addressName,
  indexHidden,
  hiddenFunction,
  requiredFunction
}) => {
  const isArrayOrPopup = isArray || isPopup;
  let atu = {};
  let streetControl = {};
  const path = isArray ? 'data.' : `data.${stepName}.${addressName}`;
  const listenedValuesForStreet = isArray
    ? `${addressName}`
    : `${stepName}.${addressName}`;
  const stepDetails = 'parentValue';
  const checkRequired = isArrayOrPopup && requiredFunction ? requiredFunction : `() => !${hidden}`;
  const checkHiddenRegion = isArrayOrPopup
    ? `(a, b, c, parentValue) => { if (!parentValue?.${addressName}Region && !parentValue?.${addressName}Region?.atuId) {return true}; return false; }`
    : `(value, parentValue, document) => { if (!parentValue?.${addressName}Region && !parentValue?.${addressName}Region?.atuId) {return true}; return false; }`;
  const checkHiddendCity = isArrayOrPopup
    ? `(a, b, c, parentValue) => { if (!parentValue?.${addressName}District && !parentValue?.${addressName}District?.atuId) {return true}; return false;}`
    : `(value, parentValue, document) => { if (!parentValue?.${addressName}District && !parentValue?.${addressName}District?.atuId) {return true}; return false;}`;
  const checkHidden =
    isArrayOrPopup && hiddenFunction ? hiddenFunction : `() => ${hidden}`;
  const checkApt = `(a, b, c, parentValue) => { const house = !(parentValue && parentValue.${addressName}IsPrivateHouse && parentValue.${addressName}IsPrivateHouse[0] === 'приватний будинок'); if (!house) {return false} return !${hidden}}`;
  const checkHiddenStreet = isArrayOrPopup
    ? `(a, b, c, parentValue) =>{ if(${allVisibleStreet}) return false; if(parentValue?.${addressName}District?.atuId && parentValue?.${addressName}City === false) return false; if(parentValue?.${addressName}District?.atuId && parentValue?.${addressName}City !== false && parentValue?.${addressName}City?.atuId) return false; return true;}`
    : recordsTree
    ? `(a, parentValue, c ) =>{ if (${hidden}) return true; if(${allVisibleStreet}) return false; if(parentValue?.${addressName}ATU?.district?.atuId && parentValue?.${addressName}ATU?.propertiesHasOptions?.city === false) return false; if(parentValue?.${addressName}ATU?.district?.atuId && parentValue?.${addressName}ATU?.propertiesHasOptions?.city !== false && parentValue?.${addressName}ATU?.city?.atuId) return false; return true;}`
    : `(a, parentValue, c ) =>{ if (${hidden}) return true; if(${allVisibleStreet}) return false; if(parentValue?.${addressName}District?.atuId && parentValue?.${addressName}City === false) return false; if(parentValue?.${addressName}District?.atuId && parentValue?.${addressName}City !== false && parentValue?.${addressName}City?.atuId) return false; return true;}`;
  switch (recordsTree) {
    case false: {
      atu = {
        [`${addressName}Region`]: {
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
        [`${addressName}District`]: {
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
          listenedValuesForRequest: [
            isArray
              ? `${addressName}Region`
              : `${stepName}.${addressName}Region`,
          ],
          indexedSort: {
            'sort[data.name]': 'asc',
          },
          search: isArrayOrPopup
            ? `(data, objectPath) => {const res = objectPath.get(data, '${
                isPopup ? '' : stepName
              }');return res.${addressName}Region && res.${addressName}Region.atuId  || 'unknown'; }`
            : `(data) => { return ${path}Region && ${path}Region.atuId  || 'unknown'; }`,
        },
        [`${addressName}City`]: {
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
            isArray
              ? `${addressName}District`
              : `${stepName}.${addressName}District`,
          ],
          indexedSort: {
            'sort[data.type]': 'asc',
          },
          search: isArrayOrPopup
            ? `(data, objectPath) => {const res = objectPath.get(data, '${
                isPopup ? '' : stepName
              }');return res.${addressName}District && res.${addressName}District.atuId  || 'unknown'; }`
            : `(data) => { return ${path}District && ${path}District.atuId  || 'unknown'; }`,
        },
      };
      break;
    }
    case true: {
      atu = {
        [`${addressName}ATU`]: {
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
        const regionId = ${path}${
          isArrayOrPopup ? addressName : ''
        }ATU?.region?.atuId;
        const districtId = ${path}${
          isArrayOrPopup ? addressName : ''
        }ATU?.district?.atuId;
        const cityId = ${path}${
          isArrayOrPopup ? addressName : ''
        }ATU?.city?.atuId;
        return [regionId, districtId, cityId].filter(Boolean).length ? [regionId, districtId, cityId].filter(Boolean) : 'unknown';
    }`;

  const streetSearch = `(data, objectPath) => {
        const res = objectPath.get(data, '${isPopup ? '' : stepName}');
        const regionId = ${isArrayOrPopup} ? res?.${addressName}Region?.atuId : ${path}Region?.atuId;
        const districtId = ${isArrayOrPopup} ? res?.${addressName}District?.atuId : ${path}District?.atuId;
        const cityId = ${isArrayOrPopup} ? res?.${addressName}City?.atuId: ${path}City?.atuId;
        return [regionId, districtId, cityId].filter(Boolean).length ? [regionId, districtId, cityId].filter(Boolean) : 'unknown';
    }`;

  const recordsTreeListened = [
    `${listenedValuesForStreet}ATU.region`,
    `${listenedValuesForStreet}ATU.district`,
    `${listenedValuesForStreet}ATU.city`,
  ];

  const listenedValuesForRequest = [
    `${listenedValuesForStreet}Region`,
    `${listenedValuesForStreet}District`,
    `${listenedValuesForStreet}City`,
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
          [`${addressName}StreetType`]: {
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
          [`${addressName}StreetName`]: {
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
        required: [`${addressName}StreetType`, `${addressName}StreetName`],
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
        isPopup: isPopup && !isArray,
        forceInit: true,
        filtersFromSchema: true,
        checkRequired: checkRequired,
        checkHidden: checkHiddenStreet,
        allVisibleStreet: allVisibleStreet,
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
        filtersFromSchema: true,
        isPopup: isPopup && !isArray,
        forceInit: true,
        checkHidden: checkHiddenStreet,
        checkRequired: checkRequired,
        allVisibleStreet: allVisibleStreet,
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

  return {
    type: 'object',
    properties: {
      ...atu,
      [`${addressName}Street`]: streetControl,
      [`${addressName}Building`]: {
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
            cleanWhenHidden: true,
            address: true,
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
            checkHidden: `(propertyData, pageObject, allStepsData, parentValue) => { return (${stepDetails} && ${stepDetails}.${addressName}IsPrivateHouse && ${stepDetails}.${addressName}IsPrivateHouse[0] === 'приватний будинок')}`,
          },
          index: {
            type: 'string',
            description: 'Індекс',
            address: true,
            checkRequired: `(propertyData, pageObject, allStepsData, parentValue) => { if (${hidden}) { return false; }  return (parentValue && parentValue.${addressName}IsPrivateHouse && parentValue.${addressName}IsPrivateHouse[0] === 'приватний будинок'); }`,
            sample:
              "<div style='display: inline-flex; background: #FFF4D7; padding: 10px 15px 10px 15px'><a href='https://index.ukrposhta.ua/find-post-index' target='_blank' style='color:#000000;'>Дізнатись свій індекс</a></div></div>",
            width: '50%',
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 5',
                errorText: 'Має містити 5 цифр',
              },
            ],
            mask: '99999',
            checkHidden: `(propertyData, pageObject, allStepsData, parentValue) => { return  !(${stepDetails} && ${stepDetails}.${addressName}IsPrivateHouse && ${stepDetails}.${addressName}IsPrivateHouse[0] === 'приватний будинок')}`,
          },
        },
        required: [],
      },
      [`${addressName}IsPrivateHouse`]: {
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
      [`${addressName}Apt`]: {
        control: 'form.group',
        blockDisplay: false,
        outlined: false,
        checkHidden: checkHidden,
        cleanWhenHidden: true,
        properties: {
          apt: {
            type: 'string',
            description: 'Номер квартири',
            cleanWhenHidden: true,
            width: '50%',
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
            checkHidden: `(propertyData, pageObject, allStepsData, parentValue) => { return (${stepDetails} && ${stepDetails}.${addressName}IsPrivateHouse && ${stepDetails}.${addressName}IsPrivateHouse[0] === 'приватний будинок')}`,
            checkRequired: isArrayOrPopup
              ? checkApt
              : `(propertyData, pageObject, allStepsData, parentValue) => { if (${hidden}) { return false; } return !(parentValue && parentValue.${addressName}IsPrivateHouse && parentValue.${addressName}IsPrivateHouse[0] === 'приватний будинок')}`,
          },
          index: {
            type: 'string',
            description: 'Індекс',
            width: '50%',
            address: true,
            checkRequired: isArrayOrPopup
              ? checkApt
              : `(value, pageObject, allStepsData, parentValue) => { if (${hidden}) { return false; } return !parentValue?.${addressName}IsPrivateHouse || parentValue?.${addressName}IsPrivateHouse[0] !== 'приватний будинок';}`,
            sample:
              "<div style='display: inline-flex; background: #FFF4D7; padding: 10px 15px 10px 15px'><a href='https://index.ukrposhta.ua/find-post-index' target='_blank' style='color:#000000;'>Дізнатись свій індекс</a></div></div>",
            checkValid: [
              {
                isValid:
                  '(propertyValue, stepValue, documentValue) => propertyValue && propertyValue.length === 5',
                errorText: 'Має містити 5 цифр',
              },
            ],
            mask: '99999',
            checkHidden: `(propertyData, pageObject, allStepsData, parentValue) => { return (${stepDetails} && ${stepDetails}.${addressName}IsPrivateHouse && ${stepDetails}.${addressName}IsPrivateHouse[0] === 'приватний будинок')}`,
          },
        },
        required: [],
      },
    },
  };
};

export { calcTriggersMulti, defaultSchemaMulti };
