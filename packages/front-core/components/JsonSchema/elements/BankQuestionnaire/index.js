import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { jsonSchemaInjection } from 'actions/documentTemplate';
import { requestExternalData } from 'actions/externalReader';
import { updateTaskDocumentValues } from 'application/actions/task';
import diff from 'helpers/diff';
import evaluate from 'helpers/evaluate';
import objectPath from 'object-path';

const BankQuestionnaire = (props) => {
  const {
    template,
    stepName,
    actions,
    name,
    path,
    filters,
    rootDocument,
    serviceErrorMessage,
    pendingMessage,
    onChange,
    taskId,
    handleStore,
    triggerValue,
    schema,
    errorPath,
    task,
  } = props;
  const dispatch = useDispatch();
  const [trigger, setTrigger] = React.useState(null);

  React.useEffect(() => {
    const setExternalErrorMessage = (result, serviceErrorMessage) => {
      if (!serviceErrorMessage) return;

      let evaluatedErrorMessage = evaluate(serviceErrorMessage, result);

      if (evaluatedErrorMessage instanceof Error) {
        evaluatedErrorMessage = serviceErrorMessage;
      }
      const data = task.document.data;
      if (errorPath) {
        objectPath.set(data, errorPath, result);
      }

      const injectedTemplate = JSON.parse(JSON.stringify({ ...template }));

      injectedTemplate.jsonSchema.properties[stepName] = {
        ...template.jsonSchema.properties[stepName],
        properties: {
          ...template.jsonSchema.properties[stepName].properties,
          warning: {
            control: 'text.block',
            htmlBlock: `
              <div class='fop-blocked-descr'>
                <p class="info-block-icon" style="font-size: 38px; margin-bottom: 15px;">🤷🏻‍♂</p>
                <p>${evaluatedErrorMessage}</p>
              </div>
            `,
          },
        },
      };

      jsonSchemaInjection(injectedTemplate)(dispatch);
    };

    const setPendingMessage = (message) => {
      for (let prop in template.jsonSchema.properties[stepName].properties) {
        if (prop !== name) {
          delete template.jsonSchema.properties[stepName].properties[prop];
        }
      }

      const injectedTemplate = JSON.parse(JSON.stringify({ ...template }));

      injectedTemplate.jsonSchema.properties[stepName] = {
        ...template.jsonSchema.properties[stepName],
        properties: {
          ...template.jsonSchema.properties[stepName].properties,
          pending: {
            control: 'text.block',
            htmlBlock: `<p class='info-block'>${message}</p>`,
          },
        },
      };

      if (!message) {
        actions.setBusy(false);
        return;
      }

      actions.setBusy(true);

      jsonSchemaInjection(injectedTemplate)(dispatch);
    };

    const fetchData = async (triggerData) => {
      try {
        setTrigger(triggerData);
        setPendingMessage(pendingMessage);

        let filterValue = evaluate(filters, rootDocument.data);

        const result = await requestExternalData({
          service: 'bank',
          method: 'init',
          filters: filterValue instanceof Error ? {} : filterValue,
        })(dispatch);

        setPendingMessage(null);

        if (result instanceof Error || result.error) {
          setExternalErrorMessage(result.error || result, serviceErrorMessage);
          return;
        }

        const data = task.document.data;
        if (errorPath) {
          objectPath.set(data, errorPath, undefined);
        }

        const resultSteps = Object.keys(result).filter(
          (key) => result[key].type === 'object',
        );
        const [firstStep, ...otherSteps] = resultSteps;

        const firstResultStep = result[firstStep];

        const injectedTemplate = JSON.parse(JSON.stringify({ ...template }));

        injectedTemplate.jsonSchema.properties[stepName] = {
          ...template.jsonSchema.properties[stepName],
          ...firstResultStep,
          properties: {
            ...template.jsonSchema.properties[stepName].properties,
            ...firstResultStep.properties,
          },
        };
        if (resultSteps.length > 1) {
          const additionalProperties = {};
          otherSteps.forEach((key) => {
            additionalProperties[key] = result[key];
          });

          injectedTemplate.jsonSchema.properties = {
            ...injectedTemplate.jsonSchema.properties,
            ...additionalProperties,
          };
        }

        const diffs = diff(template, injectedTemplate);

        if (!diffs) return;

        jsonSchemaInjection(injectedTemplate)(dispatch);

        await dispatch(
          updateTaskDocumentValues(
            taskId,
            [stepName].concat('workflowId'),
            result.workflowId,
          ),
        );

        handleStore();
      } catch (error) {
        console.error(error);
        setExternalErrorMessage(error, serviceErrorMessage);
        setPendingMessage(null);
      }
    };

    const triggerData = objectPath.get(rootDocument.data, triggerValue);

    if (triggerData !== trigger) {
      fetchData(triggerData);
      setTimeout(() => {
        actions.setBusy(true);
      }, 0);
    }
  }, [
    dispatch,
    actions,
    path,
    template,
    stepName,
    name,
    filters,
    rootDocument,
    serviceErrorMessage,
    pendingMessage,
    onChange,
    taskId,
    handleStore,
    trigger,
    triggerValue,
    schema,
    errorPath,
    task,
  ]);

  return null;
};

BankQuestionnaire.propTypes = {
  actions: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  template: PropTypes.object,
  stepName: PropTypes.string,
  serviceErrorMessage: PropTypes.string,
  pendingMessage: PropTypes.string,
};

BankQuestionnaire.defaultProps = {
  template: {},
  stepName: '',
  serviceErrorMessage: null,
  pendingMessage: null,
};

export default BankQuestionnaire;
