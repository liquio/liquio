import React from 'react';
import { useTranslate } from 'react-translate';
import { SchemaForm } from 'components/JsonSchema';
import cleenDeep from 'clean-deep';
import processList from 'services/processList';
import diff from 'helpers/diff';
import classNames from 'classnames';

const RenderAddressFormat = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  path,
  actions,
  stepName,
  readOnly,
  classes,
  notRequiredLabel,
}) => {
  const [actualAtu, setActualAtu] = React.useState({});

  const t = useTranslate('VerifiedUserInfo');

  const fullPath = React.useMemo(() => {
    return path.concat(name).join('.');
  }, [path, name]);

  const checkDiffs = React.useCallback(
    (newValue) => {
      const diffs = diff(
        {
          city: newValue?.city,
          district: newValue?.district,
          region: newValue?.region,
        },
        {
          city: actualAtu?.city,
          district: actualAtu?.district,
          region: actualAtu?.region,
        },
      );

      if (!Object.keys(actualAtu).length) return false;

      return diffs;
    },
    [actualAtu],
  );

  const handleChangeAtu = React.useCallback(
    async (...args) => {
      const action = async () => {
        const changedValue = args.pop().data;

        const { region, district, city, propertiesHasOptions } = changedValue;

        const mappedValue = cleenDeep({
          ...value[name],
          region: region || null,
          district: district || null,
          city: city || null,
          propertiesHasOptions,
        });

        const delStreet = !!checkDiffs(mappedValue);

        if (delStreet) {
          delete mappedValue.street;

          handleUpdateField('index.value', '');
          handleUpdateField('checkIndex', '');
        }

        await handleUpdateField(name, mappedValue);

        setActualAtu(mappedValue);
      };

      processList.hasOrSet('handleChangeAtu_user_info_control', action);
    },
    [value, name, handleUpdateField, checkDiffs],
  );

  const handleChangeAddress = React.useCallback(
    async (...args) => {
      const action = async () => {
        const changedValue = args.pop();
        const valueName = args.pop();

        const path = `${name}.${valueName}`;

        handleUpdateField('index.value', '');
        handleUpdateField('checkIndex', '');

        switch (valueName) {
          case 'street':
            handleUpdateField(path, changedValue?.data);
            break;
          case 'isPrivateHouse':
            handleUpdateField(path, !!changedValue?.data?.length);
            handleUpdateField(`${name}.apartment`, { value: null });
            handleUpdateField(`${name}.korp`, { value: null });
            break;
          case 'building':
            handleUpdateField(path, { value: changedValue });
            break;
          case 'apartment':
            handleUpdateField(path, { value: changedValue });
            break;
          case 'korp':
            handleUpdateField(path, { value: changedValue });
            break;
          default:
            break;
        }
      };

      processList.hasOrSet('handleChangeAddress_user_info_control', action);
    },
    [name, handleUpdateField],
  );

  const lastElement = path[path.length - 1];

  const rootDocument = React.useMemo(() => {
    return {
      data: {
        [stepName]: {
          [lastElement]: {
            address: { ...actualAtu },
          },
        },
      },
    };
  }, [actualAtu, stepName, lastElement]);

  const originDocument = React.useMemo(() => {
    return {
      data: {
        [stepName]: {
          [lastElement]: {
            address: value[name],
          },
        },
      },
    };
  }, [value, name, stepName, lastElement]);

  const isPrivateHouse = React.useMemo(() => {
    return value?.[name]?.isPrivateHouse;
  }, [value, name]);

  const privateHouseText = 'приватний будинок';

  return (
    <>
      {fields?.includes(name) ? (
        <>
          <div
            className={classNames({
              [classes.infoBlockHeadline]: true,
              [classes.infoBlockHeadlinePassport]: true,
            })}
          >
            {t('addressTitle')}
          </div>
          <SchemaForm
            schema={{
              type: 'object',
              properties: {
                address: {
                  type: 'object',
                  control: 'register',
                  allVisibleRequired: true,
                  properties: {
                    region: {
                      keyId: 408,
                      description: t('RegionRegister'),
                    },
                    district: {
                      keyId: 410,
                      description: t('DistrictRegister'),
                    },
                    city: {
                      keyId: 411,
                      description: t('CityRegister'),
                    },
                  },
                },
              },
            }}
            errors={errors}
            value={{
              address: {
                region: value?.[name]?.region || null,
                district: value?.[name]?.district || null,
                city: value?.[name]?.city || null,
              },
            }}
            onChange={handleChangeAtu}
            readOnly={readOnly}
          />

          <SchemaForm
            actions={actions}
            rootDocument={rootDocument}
            originDocument={originDocument}
            schema={{
              type: 'object',
              properties: {
                street: {
                  type: 'object',
                  control: 'register',
                  keyId: 450,
                  description: t('StreetName'),
                  filtersType: 'or',
                  autocomplete: true,
                  autocompleteField: 'name',
                  cleanWhenHidden: true,
                  markWhenEmpty: true,
                  filtersFromSchema: true,
                  address: true,
                  useOrigin: true,
                  notRequiredLabel: '',
                  listenedValuesForce: true,
                  listenedValuesForRequest: [
                    `${fullPath}.region`,
                    `${fullPath}.district`,
                    `${fullPath}.city`,
                  ],
                  indexedSort: {
                    'sort[data.name]': 'asc',
                  },
                  search: `(data) => {
                    const regionId = data?.${fullPath}?.region?.atuId;
                    const districtId = data?.${fullPath}?.district?.atuId;
                    const cityId = data?.${fullPath}?.city?.atuId;
                    const atuIds = [regionId, districtId, cityId].filter(Boolean);
                    return atuIds.length ? atuIds : 'unknown';
                  }`,
                },
                building: {
                  control: 'form.group',
                  blockDisplay: false,
                  outlined: false,
                  noMargin: true,
                  properties: {
                    building: {
                      type: 'string',
                      description: t('building'),
                      notRequiredLabel: '',
                      maxLength: 20,
                      maxWidth: '50%',
                    },
                    korp: {
                      type: 'string',
                      description: t('korp'),
                      maxLength: 20,
                      notRequiredLabel: notRequiredLabel?.korp || undefined,
                      checkHidden: isPrivateHouse,
                    },
                  },
                },
                isPrivateHouse: {
                  type: 'array',
                  control: 'checkbox.group',
                  secondary: true,
                  withIndex: false,
                  hiddenParent: true,
                  hiddenKorpus: true,
                  items: [
                    {
                      id: privateHouseText,
                      title: t('isPrivateHouse'),
                    },
                  ],
                  rowDirection: true,
                },
                apartment: {
                  control: 'form.group',
                  blockDisplay: false,
                  outlined: false,
                  properties: {
                    apartment: {
                      type: 'string',
                      description: t('apt'),
                      maxLength: 20,
                      notRequiredLabel: '',
                      checkHidden: isPrivateHouse,
                    },
                  },
                },
              },
            }}
            errors={errors}
            value={{
              address: {
                region: value?.[name]?.region || {},
                district: value?.[name]?.district || {},
                city: value?.[name]?.city || {},
              },
              street: value?.[name]?.street || {},
              building: {
                building: value?.[name]?.building?.value || '',
                korp: value?.[name]?.korp?.value || '',
              },
              isPrivateHouse: value?.[name]?.isPrivateHouse
                ? [privateHouseText]
                : [],
              apartment: {
                apartment: value?.[name]?.apartment?.value || '',
              },
            }}
            onChange={handleChangeAddress}
            readOnly={readOnly}
          />
        </>
      ) : null}
    </>
  );
};

export default RenderAddressFormat;
