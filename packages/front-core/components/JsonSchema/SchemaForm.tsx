/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/jsx-props-no-spreading */
import React, { Suspense } from 'react';
import { connect, useDispatch } from 'react-redux';
import objectPath from 'object-path';

import ProgressLine from 'components/Preloader/ProgressLine';
import Preloader from 'components/Preloader';
import formElements from 'components/JsonSchema/elements';
import CustomWidthTooltip from 'components/JsonSchema/elements/CustomWidthTooltip';

import getFormElementName from 'components/JsonSchema/helpers/getFormElementName';
import getMessages from 'components/JsonSchema/helpers/getMessages';

import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';
import diff from 'helpers/diff';

import checkIsHidden from 'components/JsonSchema/helpers/checkIsHidden';
import getSampleText from 'components/JsonSchema/helpers/getSampleText';
import getIsReadonly from 'components/JsonSchema/helpers/getIsReadonly';
import getRequired from 'components/JsonSchema/helpers/getRequired';
import getIsRequired from 'components/JsonSchema/helpers/getIsRequired';

import { deleteDocumentAttach } from 'application/actions/task';
import { JsonSchemaNode, RootDocument } from './types';

const SUPPORTED_TOOLTIP = ['string'];

const SUPPORTED_TOOLTIP_LISTS = [
  'register',
  'external.register',
  'register.list',
  'related.selects',
  'select',
  'registry.search',
  'dynamic.select',
  'register.select',
];

const UNSUPPORTED_TOOLTIP = ['radio.group', 'checkbox.group'];

const CONTROL_WITHOUT_FORM = ['getter'];

const SYMBOLS_LIMIT = 60;

interface SchemaFormProps {
  path?: Array<string | number>;
  value?: unknown;
  steps?: string[];
  errors?: Array<{ path: string; [key: string]: unknown }>;
  actions?: { setDefaultValueExecuted?: (path: string) => void; [key: string]: unknown };
  readOnly?: unknown;
  readonly?: unknown;
  stepName?: string;
  onChange: (value: unknown) => void;
  activeStep?: number;
  parentValue?: unknown;
  rootDocument?: RootDocument;
  userInfo?: unknown;
  customControls?: Record<string, React.ComponentType<Record<string, unknown>>>;
  schema: JsonSchemaNode;
  task?: { meta?: { defaultValueExecuted?: string[] } };
  defaultValueExecuted?: string[];
  documentValue?: RootDocument;
  renderOneLine?: boolean;
  required?: boolean | string[];
  template?: unknown;
  [key: string]: unknown;
}

const SchemaForm = (rawProps: SchemaFormProps) => {
  // React 19 dropped `defaultProps` support for function components, so the
  // defaults formerly declared via `SchemaForm.defaultProps` are applied
  // here instead, ahead of destructuring, to preserve exact behavior
  // (including for the props read directly off `props.x` below, and the
  // ones spread on to child elements via `{...props}`).
  const props: SchemaFormProps = { ...rawProps };
  props.schema = props.schema ?? {};
  props.errors = props.errors ?? [];
  props.path = props.path ?? [];
  props.required = props.required ?? false;
  props.rootDocument = props.rootDocument ?? { data: {} };
  props.onChange = props.onChange ?? (() => null);
  props.customControls = props.customControls ?? {};
  props.readOnly = props.readOnly ?? false;
  props.locked = props.locked ?? false;
  props.renderOneLine = props.renderOneLine ?? false;
  const {
    path = [],
    value,
    steps,
    errors,
    actions = {},
    readOnly,
    readonly,
    stepName,
    onChange,
    activeStep,
    parentValue,
    rootDocument = { data: {} },
    userInfo,
    customControls,
    schema,
    schema: { control, keepSelection, setDefaultValue, cleanWhenHidden } = {},
    task: { meta: { defaultValueExecuted = [] } = {} } = {},
    defaultValueExecuted: defaultValueExecutedStated = [],
    documentValue,
    renderOneLine,
  } = props;

  const stringifiedPath = path.join('.');

  const [isHidden, setIsHidden] = React.useState(
    checkIsHidden({
      ...props,
      activeStep: activeStep as number,
      rootDocument: documentValue ? documentValue : rootDocument,
    }),
  );
  const [isReadonly, setIsReadonly] = React.useState(getIsReadonly({ ...props, activeStep: activeStep as number }));
  const [sample, setSample] = React.useState(getSampleText({ ...props, steps: steps as string[], activeStep: activeStep as number }));
  const [required, setRequired] = React.useState(getRequired(props as never));
  const [isRequired, setIsRequired] = React.useState(
    getIsRequired({
      ...props,
      activeStep: activeStep as number,
      rootDocument: documentValue ? documentValue : rootDocument,
    } as never),
  );

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (
      setDefaultValue &&
      control !== 'register' &&
      (value === undefined || defaultValueExecuted.length > 0 && !defaultValueExecuted.includes(stringifiedPath)) &&
      !defaultValueExecutedStated.includes(stringifiedPath)
    ) {
      try {
        const newValue = evaluate(setDefaultValue as string, rootDocument.data);
        if (newValue !== undefined) {
          console.log('set default value', stringifiedPath, newValue);
          actions.setDefaultValueExecuted &&
            actions.setDefaultValueExecuted(stringifiedPath);
          onChange(newValue);
        }
      } catch (e) {
        console.error('set default value error', e);
      }
    }
  }, [
    actions,
    control,
    defaultValueExecuted,
    onChange,
    stringifiedPath,
    rootDocument.data,
    setDefaultValue,
    value,
    defaultValueExecutedStated,
  ]);

  React.useEffect(() => {
    const newIsHidden = checkIsHidden({
      value,
      steps,
      activeStep: activeStep as number,
      parentValue,
      rootDocument: documentValue ? documentValue : rootDocument,
      userInfo,
      schema,
    });

    if (newIsHidden !== isHidden || (value !== null && value !== undefined)) {
      setIsHidden(newIsHidden);

      if (
        value !== null &&
        value !== undefined &&
        newIsHidden &&
        cleanWhenHidden &&
        !keepSelection
      ) {
        waiter.addAction(
          'deleteAttaches-' + stringifiedPath,
          async () => {
            if (schema?.control === 'select.files') {
              const controlData = objectPath.get(
                documentValue?.data ? documentValue?.data : rootDocument.data,
                `${(steps as string[])[activeStep as number]}.${stringifiedPath}`,
              );
              if (!controlData) return;
              ([] as unknown[])
                .concat(controlData as never)
                .forEach((file) => deleteDocumentAttach(file as never)(dispatch as never));
            }
          },
          150,
        );

        waiter.addAction(
          'setNull-' + stringifiedPath,
          () => onChange(null),
          50,
        );
      }
    }
  }, [
    activeStep,
    isHidden,
    parentValue,
    documentValue,
    rootDocument,
    schema,
    steps,
    value,
    cleanWhenHidden,
    keepSelection,
    onChange,
    stringifiedPath,
    userInfo,
    dispatch,
  ]);

  React.useEffect(() => {
    const newSample = getSampleText({
      value,
      steps: steps as string[],
      sample,
      activeStep: activeStep as number,
      parentValue,
      rootDocument: documentValue ? documentValue : rootDocument,
      schema,
    });

    if (sample !== newSample) {
      setSample(newSample);
    }
  }, [
    activeStep,
    parentValue,
    rootDocument,
    documentValue,
    sample,
    schema,
    steps,
    value,
  ]);

  React.useEffect(() => {
    const newIsReadonly = getIsReadonly({
      value,
      steps,
      readOnly,
      readonly,
      activeStep: activeStep as number,
      parentValue,
      rootDocument: documentValue ? documentValue : rootDocument,
      schema,
    });

    if (newIsReadonly !== isReadonly) {
      setIsReadonly(newIsReadonly);
    }
  }, [
    activeStep,
    isReadonly,
    parentValue,
    readOnly,
    readonly,
    rootDocument,
    documentValue,
    schema,
    steps,
    value,
  ]);

  React.useEffect(() => {
    const newRequired = getRequired({ value, schema } as never);

    if (diff(newRequired, required)) {
      setRequired(newRequired);
    }
  }, [required, schema, value]);

  React.useEffect(() => {
    const newIsRequired = getIsRequired({
      value,
      steps,
      required: props.required as boolean,
      activeStep: activeStep as number,
      parentValue,
      rootDocument: documentValue ? documentValue : rootDocument,
      schema,
    });
    if (newIsRequired !== isRequired) {
      setIsRequired(newIsRequired);
    }
  }, [
    activeStep,
    isRequired,
    parentValue,
    props.required,
    rootDocument,
    documentValue,
    schema,
    steps,
    value,
  ]);

  const componentName = getFormElementName(schema);
  const FormControl = ({ ...formElements, ...customControls } as unknown as Record<string, React.ComponentType<Record<string, unknown>>>)[componentName as string];

  const error = React.useMemo(() => {
    return typeof errors?.find === 'function' && errors.find((e) => e.path === stringifiedPath);
  }, [errors, stringifiedPath]);

  if (
    !componentName ||
    !path ||
    CONTROL_WITHOUT_FORM.includes(schema?.control as string)
  ) {
    return null;
  }

  if (!FormControl) {
    return <div>{`${componentName} не налаштований`}</div>;
  }

  if (schema.external && !value) {
    return <Preloader />;
  }

  let evaluatedTitle: unknown = evaluate(
    schema?.description as string,
    value,
    (rootDocument.data[steps as unknown as string] as Record<string, unknown>) && (rootDocument.data as Record<string, unknown>)[(steps as string[])[activeStep as number]],
    rootDocument.data,
  );

  if (evaluatedTitle instanceof Error) {
    evaluatedTitle = schema?.description;
  }

  const withTooltip = (() => {
    try {
      const isSupported =
        SUPPORTED_TOOLTIP_LISTS.concat(SUPPORTED_TOOLTIP).some((supported) =>
          [schema?.type, schema?.control].includes(supported),
        ) &&
        !UNSUPPORTED_TOOLTIP.some((supported) =>
          [schema?.control].includes(supported),
        );

      if (!isSupported) return;


      const isLonger = (string: unknown) =>
        ((string as string) || '').length > SYMBOLS_LIMIT && !schema?.properties;

      if (evaluatedTitle instanceof Error) {
        return isLonger(schema?.description);
      }

      return isLonger(evaluatedTitle);
    } catch {
      return false;
    }
  })();

  const tooltipPosition = SUPPORTED_TOOLTIP_LISTS.includes(schema?.control as string)
    ? 'top-start' as const
    : 'bottom-start' as const;

  const controlIsHidden = checkIsHidden({
    ...props,
    activeStep: activeStep as number,
    rootDocument: documentValue ? documentValue : rootDocument,
  });

  const controlComponent = (
    <Suspense fallback={<ProgressLine />}>
      <FormControl
        {...(schema as unknown as Record<string, unknown>)}
        {...(props as unknown as Record<string, unknown>)}
        template={props.template || { jsonSchema: schema }}
        messageList={getMessages(schema as never, ([] as unknown[]).concat(stepName as never, path) as (string | number)[], props as never)}
        schema={schema}
        documentValue={documentValue}
        setDefaultValue={schema.setDefaultValue}
        sample={sample}
        description={schema.description}
        error={error}
        readOnly={isReadonly}
        required={isRequired}
        hidden={controlIsHidden}
        renderOneLine={renderOneLine}
      />
    </Suspense>
  );
  if (withTooltip && !controlIsHidden) {
    return (
      <CustomWidthTooltip
        title={evaluatedTitle as React.ReactNode}
        placement={tooltipPosition}
      >
        <div>{controlComponent}</div>
      </CustomWidthTooltip>
    );
  }

  return controlComponent;
};

const mapStateToProps = ({ auth: { info, userUnits } }: { auth: { info: Record<string, unknown>; userUnits: unknown[] } }) => ({
  userInfo: {
    ...info,
    userUnits,
  },
});

export default connect(mapStateToProps, null)(SchemaForm as never) as unknown as React.ComponentType<Record<string, unknown>>;
