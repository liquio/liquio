import React from 'react';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import Select from 'components/Select';
import { requestRegisterKeyRecords } from 'actions/registry';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const RenderSelectField = ({
  name,
  fields,
  errors,
  value,
  handleUpdateField,
  keyId,
  citizenShipExists,
  readOnly,
}) => {
  const [countries, setCountries] = React.useState([]);
  const t = useTranslate('VerifiedUserInfo');
  const dispatch = useDispatch();

  React.useEffect(() => {
    const fetchData = async () => {
      const result = await dispatch(
        requestRegisterKeyRecords(keyId, {
          strict: true,
          limit: 1500,
        }),
      );

      if (result instanceof Error) {
        return;
      }

      setCountries(result);
    };

    fetchData();
  }, [dispatch, keyId]);

  React.useEffect(() => {
    if (value?.[name]?.value && citizenShipExists) {
      handleUpdateField(name, { value: null });
    }
  }, [citizenShipExists, handleUpdateField, name, value]);

  const error = errors.find(({ path }) => {
    if (typeof path === 'string') {
      return path.includes(name);
    }
    return false;
  });

  return (
    <>
      {fields?.includes(name) ? (
        <ElementContainer required={true} error={error} bottomSample={true}>
          <Select
            description={t(name)}
            isLoading={!countries.length}
            value={value?.[name]?.value}
            onChange={(event) => {
              handleUpdateField(name, { value: event });
            }}
            options={countries}
            readOnly={readOnly}
          />
        </ElementContainer>
      ) : null}
    </>
  );
};

export default RenderSelectField;
