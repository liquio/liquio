import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import withStyles from '@mui/styles/withStyles';
import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';

const styles = {
  formControl: {
    padding: '0 0 10px',
  },
};

const toOption = (opt) => (opt.id ? { ...opt } : null);

const Registerlink = ({
  actions,
  hidden,
  linkKeyId,
  linkTo,
  value,
  onChange,
  required,
  error,
  limit,
  description,
  ...rest
}) => {
  const [loading, setLoading] = React.useState(false);
  const [optionsArray, setFirstStedData] = React.useState(null);

  React.useEffect(() => {
    const init = async () => {
      setLoading(true);
      const options = await actions.requestRegisterKeyRecords(linkKeyId, {
        limit,
      });
      setLoading(false);
      setFirstStedData(options.map(toOption));
    };

    init();
  }, []);

  const handleChange = (newValue) => {
    const saving = newValue.data[linkTo];
    onChange(saving);
  };

  if (hidden) return null;

  const chosenValue = (optionsArray || []).find(({ data }) => {
    if (!value) return false;
    return data[linkTo] === value;
  });

  return (
    <ElementContainer required={required} error={error} bottomSample={true}>
      <Select
        {...rest}
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

Registerlink.propTypes = {
  actions: PropTypes.object.isRequired,
  hidden: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  limit: PropTypes.number,
};

Registerlink.defaultProps = {
  hidden: false,
  limit: 1000,
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords,
      dispatch,
    ),
  },
});

const styled = withStyles(styles)(Registerlink);

const translated = translate('Elements')(styled);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
