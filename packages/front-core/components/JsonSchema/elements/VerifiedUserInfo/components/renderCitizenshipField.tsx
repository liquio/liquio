import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import Select from 'components/Select';
import * as registryActions from 'actions/registry';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

interface RegistryOption {
  [key: string]: unknown;
}

interface FieldError {
  path?: unknown;
  [key: string]: unknown;
}

interface RenderCitizenshipFieldProps {
  name: string;
  fields?: string[];
  errors: FieldError[];
  value?: Record<string, { value?: unknown }>;
  handleUpdateField: (name: string | string[], value: unknown) => void;
  keyId: string | number;
  citizenShipExists?: boolean;
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

const RenderCitizenshipField = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  keyId,
  citizenShipExists,
  readOnly,
}: RenderCitizenshipFieldProps) => {
  const [countries, setCountries] = React.useState<RegistryOption[]>([]);
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
      setCountries(result as RegistryOption[]);
    };

    void fetchData();
  }, [dispatch, keyId]);

  React.useEffect(() => {
    if (value?.[name]?.value && citizenShipExists) {
      handleUpdateField(name, { value: null });
    }
  }, [citizenShipExists, handleUpdateField, name, value]);

  const error = errors.find(({ path }) =>
    typeof path === 'string' ? path.includes(name) : false,
  );

  return fields?.includes(name) ? (
    <ElementContainer required={true} error={error} bottomSample={true}>
      <Select
        description={t(name)}
        isLoading={!countries.length}
        value={value?.[name]?.value}
        onChange={(nextValue: unknown) => {
          handleUpdateField(name, { value: nextValue });
        }}
        options={countries}
        readOnly={readOnly}
      />
    </ElementContainer>
  ) : null;
};

export default RenderCitizenshipField;
