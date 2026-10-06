import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import PreloaderRaw from 'components/Preloader';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import emptyGateway from 'application/modules/workflow/variables/emptyGateway';
import gatewayElementTypes from 'application/modules/workflow/variables/gatewayElementTypes';
import getGatewayTypeId from 'application/modules/workflow/pages/Workflow/helpers/getGatewayTypeId';
import {
  requestGateway,
  changeGatewayData,
  saveGatewayData,
  getGatewayTypes,
} from 'application/actions/gateways';
import minUnusedIndex from 'helpers/minUnusedIndex';
import padWithZeroes from 'helpers/padWithZeroes';
import processList from 'services/processList';
import checkAccess from 'helpers/checkAccess';

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface GatewayType {
  id?: string | number;
  name?: string;
  [key: string]: unknown;
}

interface Formula {
  id?: string;
  isDefault?: boolean;
  [key: string]: unknown;
}

interface GatewayEntity {
  jsonSchema: { formulas?: Formula[]; [key: string]: unknown };
  [key: string]: unknown;
}

interface BpmnBusinessObject {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface BpmnLabel {
  businessObject?: { name?: string };
}

interface BpmnOutgoing {
  id: string;
  labels: BpmnLabel[];
}

interface BpmnElement {
  id: string;
  outgoing: BpmnOutgoing[];
  businessObject: BpmnBusinessObject;
}

interface ElementRegistryEntry {
  type: string;
  id: string;
  businessObject: BpmnBusinessObject;
}

interface ElementRegistry {
  getAll(): ElementRegistryEntry[];
}

interface GatewayElementProps {
  element: BpmnElement;
  gatewayTypes?: GatewayType[] | null;
  t: (key: string) => string;
  handleSave?: boolean;
  workflow: { id?: string | number };
  actions: {
    requestGateway: (gatewayId: number) => Promise<GatewayEntity | Error>;
    saveGatewayData: (data: unknown) => Promise<unknown>;
    changeGatewayData: (gatewayId: number, data: unknown) => unknown;
    getGatewayTypes: () => Promise<GatewayType[]>;
  };
  actualGatewayList: Record<string, GatewayEntity>;
  onChange: (businessObject: BpmnBusinessObject) => void;
  modeler?: BpmnJsInstance | null;
  selectionId?: string | null;
  userInfo: Record<string, unknown>;
  userUnits: unknown[];
}

const GatewayElement = ({
  element,
  gatewayTypes,
  t,
  handleSave,
  workflow,
  actions,
  actualGatewayList,
  onChange,
  gatewayTypes: types,
  modeler,
  selectionId,
  userInfo,
  userUnits,
}: GatewayElementProps) => {
  const { outgoing } = element;

  const isLocalId = (id: string) =>
    gatewayElementTypes.some((type) => {
      const suffix = type.split(':').pop() as string;
      return id.indexOf(suffix) === 0;
    });

  const getGatewayId = ({ businessObject: { id } }: { businessObject: { id: string } }) =>
    parseInt(id.split('-').pop() as string, 10);

  const getGatewayData = () => {
    const gatewayId = getGatewayId(element);

    const gateway = actualGatewayList[gatewayId];

    return gateway;
  };

  const getDefaultBranchId = () => {
    const gateway = getGatewayData();

    const chosen = (gateway?.jsonSchema?.formulas || []).find(
      (item) => item?.isDefault,
    );

    return {
      defaultBranchId: chosen?.id,
    };
  };

  const handleChange = async (gateway: unknown) =>
    await actions.changeGatewayData(getGatewayId(element), gateway);

  const handleChangeDefaultBranch = (data: { defaultBranchId?: string }) => {
    const branch = data.defaultBranchId;

    const gateway = getGatewayData();

    const formulas = gateway.jsonSchema.formulas || [];

    const chosen = formulas.find((element) => branch === element.id);

    const mapFormulas = formulas.map((item) => ({
      ...item,
      isDefault: chosen?.id === item.id,
    }));

    gateway.jsonSchema.formulas = mapFormulas;

    handleChange(gateway);
  };

  React.useEffect(() => {
    const getNextGatewayId = (element: BpmnElement) => {
      const ids = (modeler?.get('elementRegistry') as ElementRegistry)
        .getAll()
        .filter(
          ({ type, id }) =>
            gatewayElementTypes.includes(type) &&
            id !== element.businessObject.id,
        )
        .filter(({ businessObject: { id } }) => !isLocalId(id))
        .map(getGatewayId as never)
        .filter(Number.isInteger)
        .map(String)
        .map((id: string) => id.replace(workflow.id as string, ''))
        .map((id) => parseInt(id, 10));

      return workflow.id + padWithZeroes(minUnusedIndex(ids, 1), 3);
    };

    const loadGateway = async () => {
      const gatewayTypes =
        types ||
        (await processList.hasOrSet(
          'getGatewayTypes',
          actions.getGatewayTypes as never,
        ));

      const gatewayId = getGatewayId(element);

      if (element.id.slice(element.id.length - 3) === 'end') {
        return;
      }

      if (isLocalId(element.businessObject.id)) {
        const nextGatewayId = getNextGatewayId(element);
        element.businessObject.id = ['gateway', nextGatewayId].join('-');
        element.businessObject.name =
          element.businessObject.name || t('NewGateway');
        onChange(element.businessObject);
        return;
      }

      if (
        !actualGatewayList[gatewayId] &&
        !processList.has('requestGateway', gatewayId)
      ) {
        const gateway = await processList.set(
          'requestGateway',
          actions.requestGateway as never,
          gatewayId,
        );
        if (gateway instanceof Error && gateway.message === '404 not found') {
          const gatewayTypeId = getGatewayTypeId(element as never, gatewayTypes as never);
          await actions.saveGatewayData(
            emptyGateway(gatewayId, { t, gatewayTypeId, workflow: workflow as { id: string | number } }),
          );
        }
      }
    };

    loadGateway();
  }, [
    selectionId,
    actions,
    actualGatewayList,
    element,
    onChange,
    t,
    types,
    workflow,
    modeler,
  ]);

  const gatewayTypesTranslated = (gatewayTypes || []).map((e) => ({
    ...e,
    stringified: t(e?.name as string),
  }));

  if (element.id.slice(element.id.length - 3) === 'end') {
    return null;
  }

  const gateway = getGatewayData();

  if (!gateway) {
    return <Preloader />;
  }

  const { formulas = [] } = gateway.jsonSchema;

  const getFormulas = outgoing.map(({ id, labels: [label] }, i) => {
    const currentFormula = formulas.find((formula) => [label?.businessObject?.name, id].includes(formula.id)) || formulas[i];

    return {
      ...currentFormula,
      isDefault: currentFormula?.isDefault || false,
      id: label?.businessObject?.name || id,
    }
  });

  gateway.jsonSchema.formulas = getFormulas;

  const renderDivider = (
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          divider: {
            control: 'divider',
            darkTheme: true,
            margin: 12,
          },
        },
      }}
    />
  );

  const isEditable = checkAccess(
    { userHasUnit: [1000002] },
    userInfo,
    userUnits as never,
  );

  return (
    <>
      <SchemaForm
        value={gateway}
        readOnly={!isEditable}
        onChange={handleChangeAdapter(gateway, handleChange)}
        schema={{
          type: 'object',
          properties: {
            gatewayTypeId: {
              control: 'select',
              description: t('Type'),
              noMargin: true,
              options: gatewayTypesTranslated,
              darkTheme: true,
              allowDelete: false,
              variant: 'outlined',
            },
          },
        }}
      />

      {renderDivider}

      <SchemaForm
        value={gateway}
        readOnly={!isEditable}
        onChange={handleChangeAdapter(gateway, handleChange)}
        handleSave={handleSave}
        schema={{
          type: 'object',
          properties: {
            jsonSchema: {
              type: 'object',
              properties: {
                formulas: {
                  type: 'array',
                  noMargin: true,
                  allowAdd: false,
                  allowDelete: false,
                  darkTheme: true,
                  disableBoxShadow: true,
                  filterEmptyValues: true,
                  items: {
                    properties: {
                      condition: {
                        control: 'code.editor',
                        description: '(value) => value?.id',
                        mode: 'javascript',
                        validate: true,
                        noMargin: true,
                        darkTheme: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }}
      />

      {renderDivider}

      <SchemaForm
        value={getDefaultBranchId()}
        readOnly={!isEditable}
        onChange={handleChangeAdapter(gateway as never, handleChangeDefaultBranch as never)}
        schema={{
          type: 'object',
          properties: {
            label: {
              control: 'text.block',
              noMargin: true,
              htmlBlock: `
                <span style="color: #fff;font-size: 16px;line-height: 19px;margin-bottom: 8px;font-weight: 500;display: inline-block;">
                  ${t('defaultBranch')}
                </span>
              `,
            },
            defaultBranchId: {
              control: 'select',
              placeholder: t('None'),
              noMargin: true,
              darkTheme: true,
              allowDelete: false,
              options: [
                ...(gateway?.jsonSchema?.formulas || []),
                {
                  id: t('None'),
                },
              ],
              variant: 'outlined',
            },
          },
        }}
      />

      {renderDivider}

      <SchemaForm
        value={gateway}
        readOnly={!isEditable}
        onChange={handleChangeAdapter(gateway, handleChange)}
        schema={{
          type: 'object',
          properties: {
            jsonSchema: {
              type: 'object',
              properties: {
                isCurrentOnly: {
                  control: 'toggle',
                  defaultValue: true,
                  darkTheme: true,
                  noMargin: true,
                  fullWidth: true,
                  labelPlacement: 'start',
                  onText: t('ConditionDefaultText'),
                },
              },
            },
          },
        }}
      />
    </>
  );
};

interface GatewayElementState {
  gateways: { actual: Record<string, GatewayEntity>; types: GatewayType[] };
  auth: { info: Record<string, unknown>; userUnits: unknown[] };
}

const mapStateToProps = ({
  gateways: { actual, types },
  auth: { info: userInfo, userUnits },
}: GatewayElementState) => ({
  actualGatewayList: actual,
  gatewayTypes: types,
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestGateway: bindActionCreators(requestGateway, dispatch),
    saveGatewayData: bindActionCreators(saveGatewayData, dispatch),
    changeGatewayData: bindActionCreators(changeGatewayData, dispatch),
    getGatewayTypes: bindActionCreators(getGatewayTypes, dispatch),
  },
});

const translated = translate('WorkflowAdminPage')(GatewayElement as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
