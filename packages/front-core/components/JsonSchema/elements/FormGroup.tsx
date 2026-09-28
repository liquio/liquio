import React from 'react';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import classNames from 'classnames';
import { SchemaForm } from 'components/JsonSchema';
import ElementGroupContainer from '../components/ElementGroupContainer';

const styles = (theme: Theme) => ({
  inlineDisplay: {
    display: 'flex',
    gap: 40,
    alignItems: 'baseline',
    '& > div:last-child': {
      marginRight: 0,
    },
    [theme.breakpoints.down('lg')]: {
      flexDirection: 'column' as const,
      gap: 40,
    },
    [theme.breakpoints.down('md')]: {
      gap: 25,
    }
  },
  blockDisplay: {
    display: 'block',
  },
  wrap: {
    flexWrap: 'wrap' as const,
  },
  formDescription: {
    marginBottom: 0,
  },
  container: {
    marginBottom: 0,
  },
  smBlockDisplay: {
    [theme.breakpoints.down('lg')]: {
      flexDirection: 'unset' as const,
    },
  },
});

interface FormGroupProps extends WithStyles<typeof styles> {
  actions?: unknown;
  blockDisplay?: boolean;
  properties?: Record<string, { readOnly?: boolean; notRequiredLabel?: string; [key: string]: unknown }>;
  sample?: string;
  description?: string;
  readOnly?: boolean;
  value?: Record<string, unknown> | null;
  error?: unknown;
  onChange?: (key: string, ...args: unknown[]) => void;
  outlined?: boolean;
  required?: unknown[] | boolean;
  schema: { required?: string[] | boolean; [key: string]: unknown };
  path: Array<string | number>;
  hidden?: boolean;
  steps?: unknown;
  task?: unknown;
  taskId?: unknown;
  documents?: unknown;
  rootDocument?: unknown;
  originDocument?: unknown;
  stepName?: unknown;
  activeStep?: unknown;
  errors?: unknown[];
  width?: number | string;
  maxWidth?: number | string;
  checkValid?: unknown;
  checkRequired?: unknown;
  fileStorage?: unknown;
  noMargin?: boolean;
  inlineDisplay?: boolean;
  triggerExternalPath?: unknown[] | null;
  externalReaderMessage?: React.ReactNode;
  notRequiredLabel?: string;
  parentValue?: unknown;
  smBlockDisplay?: boolean;
  isPopup?: boolean;
  wrap?: boolean;
  typography?: string;
  documentValue?: unknown;
  pathIndex?: unknown;
}

class FormGroup extends React.Component<FormGroupProps> {
  static defaultProps = {
    errors: {},
    value: null,
    outlined: true,
    path: [],
    required: [],
    onChange: () => null,
    noMargin: false,
    inlineDisplay: true,
    triggerExternalPath: null,
    externalReaderMessage: null,
    smBlockDisplay: false,
    isPopup: false,
    wrap: false,
    typography: 'h5',
  };

  constructor(props: FormGroupProps) {
    super(props);

    this.init(props);
  }

  componentDidUpdate({ path, activeStep }: FormGroupProps) {
    const { path: newPath, activeStep: newActiveStep } = this.props;

    if (path.join() !== newPath.join() || newActiveStep !== activeStep) {
      this.init(this.props);
    }
  }

  canChange = () => {
    const { onChange, hidden, cleanWhenHidden, keepSelection } = this.props as FormGroupProps & { cleanWhenHidden?: boolean; keepSelection?: boolean };
    return onChange && !(hidden && cleanWhenHidden && !keepSelection);
  };

  init = ({ value, onChange }: FormGroupProps) => {
    if (!value && this.canChange()) {
      (onChange as unknown as (value: unknown) => void)({});
    }
  };

  render() {
    const {
      classes,
      actions,
      blockDisplay,
      properties = {},
      sample,
      description,
      readOnly,
      value,
      error,
      onChange,
      outlined,
      required,
      schema,
      path,
      hidden,
      steps,
      task,
      taskId,
      documents,
      rootDocument,
      originDocument,
      stepName,
      activeStep,
      errors,
      width,
      maxWidth,
      checkValid,
      checkRequired,
      fileStorage,
      noMargin,
      inlineDisplay,
      triggerExternalPath,
      externalReaderMessage,
      notRequiredLabel,
      parentValue,
      smBlockDisplay,
      isPopup,
      wrap,
      typography,
      documentValue,
      pathIndex,
    } = this.props;

    if (hidden) return null;

    return (
      <ElementGroupContainer
        outlined={outlined}
        variant={typography as never}
        description={description}
        sample={sample}
        required={required as never}
        error={error as never}
        descriptionClassName={(noMargin && classes.formDescription) as never}
        width={width}
        maxWidth={maxWidth as never}
        className={classes.container}
        path={path as never}
        checkValid={checkValid}
        checkRequired={checkRequired}
        noMargin={noMargin}
        notRequiredLabel={notRequiredLabel}
      >
        <div
          className={classNames({
            [classes.inlineDisplay]: !!inlineDisplay,
            [classes.smBlockDisplay]: !!smBlockDisplay,
            [classes.blockDisplay]: !!blockDisplay,
            [classes.wrap]: !!wrap,
          })}
        >
          {Object.keys(properties).map((key) => (
            <SchemaForm
              inlineDisplay={inlineDisplay}
              actions={actions}
              steps={steps}
              task={task}
              taskId={taskId}
              activeStep={activeStep}
              documents={documents}
              rootDocument={rootDocument}
              originDocument={originDocument}
              documentValue={documentValue}
              fileStorage={fileStorage}
              stepName={stepName}
              errors={errors}
              schema={properties[key]}
              parentValue={parentValue || value}
              key={key}
              path={path.concat(key)}
              readOnly={readOnly || properties[key].readOnly}
              value={(value || {})[key]}
              onChange={onChange?.bind(null, key)}
              required={
                Array.isArray(schema.required)
                  ? schema.required.includes(key)
                  : schema.required
              }
              triggerExternalPath={triggerExternalPath}
              externalReaderMessage={externalReaderMessage}
              isPopup={isPopup}
              isFormGroup={true}
              notRequiredLabel={properties[key]?.notRequiredLabel}
              renderOneLine={true}
              pathIndex={pathIndex}
            />
          ))}
        </div>
      </ElementGroupContainer>
    );
  }
}

export default withStyles(styles)(FormGroup);
