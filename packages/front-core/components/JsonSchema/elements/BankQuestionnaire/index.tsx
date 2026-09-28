import React from 'react';
import { useDispatch } from 'react-redux';
import { jsonSchemaInjection } from 'actions/documentTemplate';
import { requestExternalData } from 'actions/externalReader';
import { updateTaskDocumentValues } from 'application/actions/task';
import diff from 'helpers/diff';
import evaluate from 'helpers/evaluate';
import objectPath from 'object-path';
import { JsonSchemaNode } from '../../types';

type Dispatch = (action: unknown) => unknown;

interface BankQuestionnaireProps {
  template?: { jsonSchema: { properties: Record<string, JsonSchemaNode> }; [key: string]: unknown };
  stepName?: string;
  actions: { setBusy: (busy: boolean) => void };
  name: string;
  path: unknown;
  filters: string;
  rootDocument: { data: Record<string, unknown> };
  serviceErrorMessage?: string | null;
  pendingMessage?: string | null;
  onChange?: unknown;
  taskId: string | number;
  handleStore: () => void;
  triggerValue: string;
  schema?: unknown;
  errorPath?: string;
  task: { document: { data: Record<string, unknown> } };
}

const BankQuestionnaire = (props: BankQuestionnaireProps) => {
  const {
    template = { jsonSchema: { properties: {} } },
    stepName = '',
    actions,
    name,
    path,
    filters,
    rootDocument,
    serviceErrorMessage = null,
    pendingMessage = null,
    onChange,
    taskId,
    handleStore,
    triggerValue,
    schema,
    errorPath,
    task,
  } = props;
  const dispatch = useDispatch();
  const [trigger, setTrigger] = React.useState<unknown>(null);

  React.useEffect(() => {
    const setExternalErrorMessage = (result: unknown, serviceErrorMessage: string | null) => {
      if (!serviceErrorMessage) return;

      let evaluatedErrorMessage: unknown = evaluate(serviceErrorMessage, result);

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

      (jsonSchemaInjection(injectedTemplate) as unknown as (dispatch: Dispatch) => unknown)(dispatch);
    };

    const setPendingMessage = (message: string | null) => {
      for (const prop in template.jsonSchema.properties[stepName].properties) {
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

      (jsonSchemaInjection(injectedTemplate) as unknown as (dispatch: Dispatch) => unknown)(dispatch);
    };

    const fetchData = async (triggerData: unknown) => {
      try {
        setTrigger(triggerData);
        setPendingMessage(pendingMessage);

        const filterValue = evaluate(filters, rootDocument.data);

        const result = (await (requestExternalData({
          service: 'bank',
          method: 'init',
          filters: filterValue instanceof Error ? {} : filterValue,
        }) as unknown as (dispatch: Dispatch) => Promise<unknown>)(dispatch)) as Record<string, { type?: string; properties?: unknown; [key: string]: unknown }> & { error?: unknown; workflowId?: unknown };

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
            ...(firstResultStep.properties as object),
          },
        };
        if (resultSteps.length > 1) {
          const additionalProperties: Record<string, unknown> = {};
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

        (jsonSchemaInjection(injectedTemplate) as unknown as (dispatch: Dispatch) => unknown)(dispatch);

        await dispatch(
          updateTaskDocumentValues(
            taskId,
            ([stepName] as unknown[]).concat('workflowId') as (string | number)[],
            result.workflowId,
            undefined,
          ) as never,
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

export default BankQuestionnaire;
