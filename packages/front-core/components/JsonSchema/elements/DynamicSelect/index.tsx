/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-restricted-globals */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import objectPath from 'object-path';
import cleenDeep from 'clean-deep';
import evaluate from 'helpers/evaluate';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import Select from 'components/Select';
import { ChangeEvent } from 'components/JsonSchema';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';

interface SelectOption {
  id?: string | number;
  label?: string | null;
  [key: string]: unknown;
}

interface DynamicSelectProps {
  onChange?: ((event: InstanceType<typeof ChangeEvent>) => void) | null;
  error?: unknown;
  description?: string | null;
  required?: boolean;
  dataPath: string;
  rootDocument: { data: Record<string, unknown> };
  hidden?: boolean;
  path: Array<string | number>;
  labelKeys?: string[] | null;
  dataMapping?: string | null;
  multiple?: boolean;
  isPopup?: boolean;
  idFieldName?: string | null;
  pathIndex?: Record<string, unknown> | null;
  options?: SelectOption[];
  documents?: { rootDocument?: { data: Record<string, unknown> } };
  value?: SelectOption | SelectOption[];
  notRequiredLabel?: string;
  [key: string]: unknown;
}

class DynamicSelect extends React.Component<DynamicSelectProps> {
  static defaultProps = {
    onChange: null,
    error: null,
    description: null,
    required: false,
    hidden: false,
    labelKeys: null,
    dataMapping: null,
    multiple: false,
    isPopup: false,
    idFieldName: null,
    pathIndex: null,
  };

  handleChange = (selected: SelectOption | SelectOption[]) => {
    const { onChange, multiple, idFieldName } = this.props;

    const options = this.getOptions() || [];

    const selectedOptionsIds = ([] as SelectOption[])
      .concat(selected)
      .filter(Boolean)
      .map((option) => option.id || option[idFieldName as string]);

    const selectedOptions = options
      .filter(({ id }) => selectedOptionsIds.includes(id))
      .map((option) => {
        if (idFieldName) {
          delete option.id;
        }

        return option;
      });

    onChange?.(
      new ChangeEvent(
        multiple ? selectedOptions : selectedOptions.shift(),
        true,
      ) as InstanceType<typeof ChangeEvent>,
    );
  };

  getOptions = (): SelectOption[] | null => {
    const {
      dataPath,
      rootDocument,
      isPopup,
      documents,
      options: schemaOptions,
      pathIndex,
      path,
    } = this.props;

    if (!dataPath && !schemaOptions) return [];

    let actualDataPath: string = dataPath;

    if (pathIndex) {
      const pathIndexes = path.filter((item) => !isNaN(item as number));

      actualDataPath = pathIndexes.reduce((acc: string, item) => {
        return acc?.replace('${index}', item as string);
      }, dataPath);
    }

    const dataSource = isPopup
      ? documents?.rootDocument?.data
      : rootDocument?.data;

    if (!dataSource) return [];

    const options = schemaOptions || (objectPath.get(dataSource, actualDataPath) as SelectOption[]);

    if (!options || !Array.isArray(options)) return null;

    const cleared = options
      .filter(Boolean)
      .filter((value) => Object.keys(value).length !== 0);

    const mapped = cleared.map((el, i) => cleenDeep(this.mapData(el, i)) as SelectOption);

    return mapped;
  };

  mapData = (opt: SelectOption, i: number): SelectOption => {
    const { dataMapping, documents } = this.props;

    const option = { ...opt };

    option.id = this.setOptionId(option, i);
    option.label = this.setOptionLabel(option);

    if (!dataMapping) return option;

    const result = evaluate(
      dataMapping,
      option,
      i,
      documents?.rootDocument?.data,
    ) as SelectOption | Error;

    if (result instanceof Error) return option;

    result.label = this.setOptionLabel(result);

    return result;
  };

  defTitle = (option: SelectOption): string => {
    if (option.label) return option.label;

    let string = '';

    Object.keys(option).forEach((item) => {
      if (item === 'id') return;
      string += ' ' + option[item];
    });

    return string;
  };

  setOptionLabel = (option: SelectOption): string | null => {
    const { labelKeys, idFieldName } = this.props;

    if (idFieldName && labelKeys) {
      return null;
    }

    return labelKeys ? this.setTitle(option) : this.defTitle(option);
  };

  setOptionId = (option: SelectOption, i: number): string | number => {
    const { idFieldName } = this.props;

    if (option.id) {
      return option.id;
    }

    if (idFieldName) {
      return option[idFieldName] as string | number;
    }

    return `${this.defTitle(option).trim()}_${i}`.replace(/ /g, '.');
  };

  setTitle = (option: SelectOption): string => {
    const { labelKeys } = this.props;

    return (labelKeys || [])
      .map((el) => el && option[el] && option[el])
      .join(' ');
  };

  getValue = (): SelectOption | SelectOption[] | undefined => {
    const { multiple, value } = this.props;

    const toOption = (option: SelectOption) => ({
      ...option,
      value: option.id,
    });

    const selected = ([] as SelectOption[]).concat(value as SelectOption).filter(Boolean).map(toOption);

    return multiple ? selected : selected.shift();
  };

  componentDidUpdate = () => {
    const { value, onChange, options: schemaOptions, idFieldName } = this.props;

    if (!value || schemaOptions) return;

    const options = this.getOptions();

    if (!options) return;

    const existing = options.find((option) =>
      [option.id, option[idFieldName as string]].includes((value as SelectOption).id),
    );

    if (!existing) onChange?.(undefined as unknown as InstanceType<typeof ChangeEvent>);
  };

  render() {
    const {
      description,
      required,
      error,
      hidden,
      path,
      notRequiredLabel,
      ...rest
    } = this.props;

    if (hidden) return null;

    const options = this.getOptions() || [];

    return (
      <ElementContainer
        {...rest}
        required={required}
        error={error}
        description={null as unknown as string}
        bottomSample={true}
      >
        <Select
          {...this.props}
          description={
            description ? (
              <FieldLabel
                description={description}
                required={required}
                notRequiredLabel={notRequiredLabel}
              />
            ) : (
              ''
            )
          }
          id={path.join('-')}
          options={options}
          value={this.getValue()}
          onChange={this.handleChange}
          aria-label={description}
        />
      </ElementContainer>
    );
  }
}

export default DynamicSelect;
