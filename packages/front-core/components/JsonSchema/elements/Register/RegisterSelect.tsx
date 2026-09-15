import React from 'react';
import { connect } from 'react-redux';
import objectPath from 'object-path';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';
import { loadTask } from 'application/actions/task';
import * as registryActions from 'application/actions/registry';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import RegisterChip from 'components/JsonSchema/elements/Register/components/Chip';
import TreeSelect from 'components/JsonSchema/elements/TreeSelect';
import { ChangeEvent } from 'components/JsonSchema';
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
} from 'helpers/localization';

// requestRegisterKeyRecordsFilter is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const requestRegisterKeyRecordsFilter = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecordsFilter;

const styles = (theme: Theme) => ({
  containerWrapper: {
    marginBottom: 0,
    '& *': {
      marginBottom: 0,
      [theme.breakpoints.down('sm')]: {
        marginBottom: 2,
        marginTop: 2,
      },
    },
  },
  bottomResultsWrapper: {
    marginTop: 10,
  },
});

interface RegisterOption {
  id?: string | number;
  name?: unknown;
  label?: unknown;
  stringified?: unknown;
  [key: string]: unknown;
}

interface RegisterSelectFilter {
  name: string;
  value: unknown;
  isValue?: boolean;
}

interface RegisterSelectProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  registerActions: {
    loadTask: (...args: unknown[]) => unknown;
    requestRegisterKeyRecordsFilter: (...args: unknown[]) => unknown;
  };
  value?: RegisterOption[] | null;
  onChange?: (event: unknown) => void;
  keyId?: number | null;
  originDocument?: unknown;
  hidden?: boolean;
  description?: string;
  error?: unknown;
  stepName: string;
  path: Array<string | number>;
  required?: boolean;
  taskId: string;
  rootDocument: { data: Record<string, unknown> };
  disabled?: string | boolean;
  filters?: RegisterSelectFilter[] | null;
  maxValues?: number | null;
  readOnly?: boolean;
  fieldToDisplay?: boolean | null;
  multiple?: boolean;
  bottomValue?: boolean;
  locked?: boolean;
  defaultLang?: string;
  template?: { jsonSchema?: { multiLanguage?: boolean } };
  noMargin?: boolean;
}

class RegisterSelect extends React.Component<RegisterSelectProps> {
  static defaultProps = {
    value: null,
    onChange: () => null,
    keyId: null,
    originDocument: {},
    hidden: false,
    error: null,
    required: false,
    description: '',
    disabled: false,
    filters: null,
    maxValues: null,
    readOnly: false,
    fieldToDisplay: null,
    multiple: true,
    bottomValue: false,
    locked: false,
  };

  optionInValue = ({ id }: RegisterOption) => {
    const { value } = this.props;
    return (value || []).some((option) => option.id === id);
  };

  handleChange = async (value: RegisterOption[] | RegisterOption | null) => {
    const { onChange } = this.props;
    onChange && onChange(new ChangeEvent(value, true, true));
  };

  onChange = (option: RegisterOption) => {
    const { value, multiple } = this.props;

    if (!option) return;

    if (!multiple) {
      return this.handleChange([option]);
    }

    if (!this.optionInValue(option)) {
      this.handleChange((value || []).concat(option));
    }
  };

  // Uses a raw eval() (not the project's helpers/evaluate wrapper) — preserved
  // exactly as in the original source, a pre-existing behavior not introduced
  // by this migration.
  getDisabled = () => {
    const { disabled, maxValues, value, rootDocument } = this.props;

    if (maxValues && value && maxValues <= value.length) {
      return true;
    }

    try {
      return disabled && eval(disabled as string)(rootDocument.data);
    } catch (e) {
      return false;
    }
  };

  getFilters = () => {
    const { filters, rootDocument } = this.props;

    const dataToFilter = (filters || []).map(({ name, value, isValue }) => {
      const filerValue = isValue
        ? value
        : objectPath.get(rootDocument.data, value as string);

      return {
        name,
        value: filerValue,
      };
    });
    const flatArray = (dataToFilter || []).reduce(
      (acc: RegisterSelectFilter[], val) => acc.concat(val),
      [],
    );
    return flatArray;
  };

  getLabel = (stringified: unknown, defaultLang?: string) => {
    if (typeof stringified === 'string' && stringified.startsWith('{')) {
      const languageCandidates = getTranslationCandidates(
        getCurrentLanguageCode({ fallbackLanguage: 'uk' }),
      ).map((candidate) => candidate.toUpperCase());
      const obj = JSON?.parse(stringified);
      return (
        languageCandidates.map((candidate) => obj[candidate]).find(Boolean) ||
        (defaultLang ? obj[defaultLang] : undefined) ||
        ''
      );
    }
    return stringified;
  };

  renderResults = () => {
    const { value, readOnly, locked, multiple, defaultLang, template } = this.props;
    const multiLanguage = template?.jsonSchema?.multiLanguage;

    if (!multiple) return null;

    return ([] as RegisterOption[])
      .concat(value || [])
      .map(({ name, label, id, stringified }) => (
        <RegisterChip
          key={id}
          label={(multiLanguage ? this.getLabel(stringified, defaultLang) : (stringified || label || name)) as string}
          disabled={!!(readOnly || locked)}
          onDelete={() =>
            this.handleChange(
              (value || []).filter((option) => option.id !== id),
            )
          }
        />
      ));
  };

  render = () => {
    const {
      hidden,
      required,
      classes,
      error,
      disabled,
      filters,
      maxValues,
      noMargin,
      readOnly,
      fieldToDisplay,
      bottomValue,
    } = this.props;

    if (hidden) return null;

    return (
      <>
        <ElementContainer
          required={required}
          error={error as never}
          bottomSample={true}
          noMargin={noMargin}
        >
          {!bottomValue ? this.renderResults() : null}
          <TreeSelect
            {...(this.props as unknown as Record<string, unknown>)}
            isDisabled={!!((disabled || maxValues) && this.getDisabled())}
            filters={filters && this.getFilters()}
            customOnChange={this.onChange}
            customHandleChange={this.handleChange}
            registerSelect={true}
            className={classes.containerWrapper}
            readOnly={readOnly}
            fieldToDisplay={fieldToDisplay}
            chipsValue={this.renderResults()}
          />
          {bottomValue ? (
            <div className={classes.bottomResultsWrapper}>
              {this.renderResults()}
            </div>
          ) : null}
        </ElementContainer>
      </>
    );
  };
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  registerActions: {
    loadTask: bindActionCreators(loadTask as never, dispatch as never),
    requestRegisterKeyRecordsFilter: bindActionCreators(
      requestRegisterKeyRecordsFilter as never,
      dispatch as never,
    ),
  },
});

const translated = translate('Elements')(RegisterSelect as never);
export default connect(
  null,
  mapDispatchToProps,
)(withStyles(styles)(translated as never));
