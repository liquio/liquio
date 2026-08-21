import React from 'react';
import withStyles from '@mui/styles/withStyles';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { SchemaForm } from 'components/JsonSchema';
import ElementGroupContainer from '../components/ElementGroupContainer';

const styles = (theme) => ({
  inlineDisplay: {
    display: 'flex',
    gap: 40,
    alignItems: 'baseline',
    '& > div:last-child': {
      marginRight: 0,
    },
    [theme.breakpoints.down('lg')]: {
      flexDirection: 'column',
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
    flexWrap: 'wrap',
  },
  formDescription: {
    marginBottom: 0,
  },
  container: {
    marginBottom: 0,
  },
  smBlockDisplay: {
    [theme.breakpoints.down('lg')]: {
      flexDirection: 'unset',
    },
  },
});

class FormGroup extends React.Component {
  constructor(props) {
    super(props);

    this.init(props);
  }

  componentDidUpdate({ path, activeStep }) {
    const { path: newPath, activeStep: newActiveStep } = this.props;

    if (path.join() !== newPath.join() || newActiveStep !== activeStep) {
      this.init(this.props);
    }
  }

  canChange = () => {
    const { onChange, hidden, cleanWhenHidden, keepSelection } = this.props;
    return onChange && !(hidden && cleanWhenHidden && !keepSelection);
  };

  init = ({ value, onChange }) => {
    if (!value && this.canChange()) {
      onChange({});
    }
  };

  render() {
    const {
      classes,
      actions,
      blockDisplay,
      properties,
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
        variant={typography}
        description={description}
        sample={sample}
        required={required}
        error={error}
        descriptionClassName={noMargin && classes.formDescription}
        width={width}
        maxWidth={maxWidth}
        className={classes.container}
        path={path}
        checkValid={checkValid}
        checkRequired={checkRequired}
        noMargin={noMargin}
        notRequiredLabel={notRequiredLabel}
      >
        <div
          className={classNames({
            [classes.inlineDisplay]: inlineDisplay,
            [classes.smBlockDisplay]: smBlockDisplay,
            [classes.blockDisplay]: blockDisplay,
            [classes.wrap]: wrap,
          })}
        >
          {Object.keys(properties || {}).map((key) => (
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
              onChange={onChange.bind(null, key)}
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

FormGroup.propTypes = {
  errors: PropTypes.array,
  value: PropTypes.object,
  outlined: PropTypes.bool,
  path: PropTypes.array,
  required: PropTypes.oneOfType([PropTypes.array, PropTypes.bool]),
  onChange: PropTypes.func,
  noMargin: PropTypes.bool,
  inlineDisplay: PropTypes.bool,
  triggerExternalPath: PropTypes.array,
  externalReaderMessage: PropTypes.node,
  smBlockDisplay: PropTypes.bool,
  isPopup: PropTypes.bool,
  wrap: PropTypes.bool,
  typography: PropTypes.string,
};

FormGroup.defaultProps = {
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

export default withStyles(styles)(FormGroup);
