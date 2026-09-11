import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import Select from 'components/Select';
import * as registryActions from 'actions/registry';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

interface CountryOption {
  nameShort?: unknown;
  code?: unknown;
  [key: string]: unknown;
}

interface FieldError {
  path?: unknown;
  [key: string]: unknown;
}

interface RenderCountryFieldProps {
  name: string;
  fields?: string[];
  errors: FieldError[];
  value?: {
    birthday?: {
      countryRecord?: { value?: CountryOption };
    };
  };
  handleUpdateField: (name: string | string[], value: unknown) => void;
  keyId: string | number;
  readOnly?: boolean;
  t?: unknown;
}

// This action exists in cabinet-front but is absent from admin-front's alias.
const requestRegisterKeyRecords = (
  registryActions as unknown as Record<
    string,
    (keyId: string | number, options: unknown) => unknown
  >
).requestRegisterKeyRecords;

const RenderCountryField = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  keyId,
  readOnly,
}: RenderCountryFieldProps) => {
  const [countries, setCountries] = React.useState<CountryOption[]>([]);
  const t = useTranslate('VerifiedUserInfo');
  const dispatch = useDispatch();

  React.useEffect(() => {
    const fetchData = async () => {
      const result = (await dispatch(
        requestRegisterKeyRecords(keyId, {
          strict: true,
          limit: 1500,
        }) as never,
      )) as unknown;

      if (result instanceof Error) return;
      setCountries(result as CountryOption[]);
    };

    void fetchData();
  }, [dispatch, keyId]);

  const error = errors.find(({ path }) =>
    typeof path === 'string' ? path.includes(name) : false,
  );

  const handleChangeCountry = React.useCallback(
    (nextValue: CountryOption | null) => {
      handleUpdateField(['birthday', 'countryRecord'], { value: nextValue });
      handleUpdateField(
        ['birthday', 'country'],
        nextValue ? nextValue.nameShort : null,
      );
      handleUpdateField(
        ['birthday', 'countryId'],
        nextValue ? nextValue.code : null,
      );
    },
    [handleUpdateField],
  );

  return fields?.includes(name) ? (
    <ElementContainer required={true} error={error} bottomSample={true}>
      <Select
        description={t(name)}
        isLoading={!countries.length}
        value={value?.birthday?.countryRecord?.value}
        onChange={handleChangeCountry}
        options={countries}
        readOnly={readOnly}
      />
    </ElementContainer>
  ) : null;
};

export default RenderCountryField;
