import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

import { requestRegisterKeyRecords } from 'application/actions/registry';

import processList from 'services/processList';

import SchemaForm from '../SchemaForm';

class RegisterForm extends React.Component {
  state = {};

  componentDidMount() {
    this.init();
  }

  componentDidUpdate() {
    this.init();
  }

  init = async () => {
    const { actions, records, keyId } = this.props;

    if (!records[keyId]) {
      processList.hasOrSet(
        'requestRegisterKeyRecords',
        actions.requestRegisterKeyRecords,
        keyId,
        {
          strict: true,
        },
      );
    }
  };

  handleChangeRecord = ({ target: { value: recordId } }) => {
    const { onChange, records, keyId } = this.props;
    onChange &&
      onChange({
        record: records[keyId].find(({ id }) => id === recordId),
      });
  };

  render() {
    const {
      value,
      records,
      keyId,
      schema: { description },
      hidden,
    } = this.props;

    if (hidden) return null;

    return (
      <>
        <FormControl variant="standard" fullWidth={true}>
          <InputLabel htmlFor="record-id">{description}</InputLabel>
          <Select
            variant="standard"
            disabled={!records[keyId]}
            value={(value && value.record && value.record.id) || ''}
            onChange={this.handleChangeRecord}
            inputProps={{
              id: 'record-id',
            }}
            aria-label={description}
          >
            {(records[keyId] || []).map((record) => (
              <MenuItem key={record.id} value={record.id}>
                {record.stringified}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {value && value.record ? (
          <SchemaForm {...this.props} schema={value.record.requirements} />
        ) : null}
      </>
    );
  }
}

RegisterForm.propTypes = {
  actions: PropTypes.object.isRequired,
  value: PropTypes.object,
  records: PropTypes.object.isRequired,
  recordId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  keyId: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  schema: {
    description: PropTypes.string.isRequired,
  },
};

RegisterForm.defaultProps = {
  value: {},
  onChange: () => null,
  schema: {},
};

const mapStateToProps = ({ registry: { keyRecords } }) => ({
  records: keyRecords,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords,
      dispatch,
    ),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(RegisterForm);
