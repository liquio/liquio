import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

import * as registryActions from 'application/actions/registry';

import processList from 'services/processList';

import SchemaForm from '../SchemaForm';

// requestRegisterKeyRecords is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const requestRegisterKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecords;

interface RegisterRecord {
  id: string | number;
  stringified?: string;
  requirements?: unknown;
  [key: string]: unknown;
}

interface RegisterFormProps {
  actions: { requestRegisterKeyRecords: (...args: unknown[]) => unknown };
  value?: { record?: RegisterRecord } | null;
  records: Record<string, RegisterRecord[]>;
  recordId: string | number;
  keyId: string;
  onChange?: (event: { record?: RegisterRecord }) => void;
  schema: { description?: string };
  hidden?: boolean;
}

class RegisterForm extends React.Component<RegisterFormProps> {
  static defaultProps = {
    value: {},
    onChange: () => null,
    schema: {},
  };

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

  handleChangeRecord = ({ target: { value: recordId } }: { target: { value: string | number } }) => {
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
            onChange={this.handleChangeRecord as never}
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
          <SchemaForm {...(this.props as unknown as Record<string, unknown>)} schema={value.record.requirements} />
        ) : null}
      </>
    );
  }
}

const mapStateToProps = ({ registry: { keyRecords } }: { registry: { keyRecords: Record<string, RegisterRecord[]> } }) => ({
  records: keyRecords,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords as never,
      dispatch as never,
    ),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(RegisterForm as never);
