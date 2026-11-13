import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import * as registryActions from 'application/actions/registry';
import withStyles from '@mui/styles/withStyles';
import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

// requestRegisterKeyRecords is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const requestRegisterKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecords;

const styles = {
  formControl: {
    padding: '0 0 10px',
  },
};

interface RegisterOption {
  id?: string | number;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

const toOption = (opt: RegisterOption): RegisterOption | null => (opt.id ? { ...opt } : null);

interface RegisterlinkProps {
  actions: { requestRegisterKeyRecords: (linkKeyId: unknown, options: unknown) => Promise<RegisterOption[]> };
  hidden?: boolean;
  linkKeyId?: unknown;
  linkTo: string;
  value?: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  error?: unknown;
  limit?: number;
  description?: string;
  [key: string]: unknown;
}

const Registerlink = ({
  actions,
  hidden = false,
  linkKeyId,
  linkTo,
  value,
  onChange,
  required,
  error,
  limit = 1000,
  description,
  ...rest
}: RegisterlinkProps) => {
  const [loading, setLoading] = React.useState(false);
  const [optionsArray, setFirstStedData] = React.useState<RegisterOption[] | null>(null);

  React.useEffect(() => {
    const init = async () => {
      setLoading(true);
      const options = await actions.requestRegisterKeyRecords(linkKeyId, {
        limit,
      });
      setLoading(false);
      setFirstStedData(options.map(toOption).filter(Boolean) as RegisterOption[]);
    };

    init();
  }, []);

  const handleChange = (newValue: RegisterOption) => {
    const saving = (newValue.data || {})[linkTo];
    onChange(saving);
  };

  if (hidden) return null;

  const chosenValue = (optionsArray || []).find(({ data }) => {
    if (!value) return false;
    return (data || {})[linkTo] === value;
  });

  return (
    <ElementContainer required={required} error={error as never} bottomSample={true}>
      <Select
        {...(rest as unknown as Record<string, unknown>)}
        value={chosenValue}
        loading={loading}
        onChange={handleChange}
        options={optionsArray}
        description={description}
        aria-label={description}
      />
    </ElementContainer>
  );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords as never,
      dispatch as never,
    ),
  },
});

const styled = withStyles(styles)(Registerlink);

const translated = translate('Elements')(styled as never);

export default connect(mapStateToProps, mapDispatchToProps)(translated as never);
