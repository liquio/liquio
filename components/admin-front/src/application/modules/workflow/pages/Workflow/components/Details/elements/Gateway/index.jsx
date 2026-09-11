import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Preloader from 'components/Preloader';
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
}) => {
  const { outgoing } = element;

  const isLocalId = (id) =>
    gatewayElementTypes.some((type) => {
      const suffix = type.split(':').pop();
      return id.indexOf(suffix) === 0;
    });

  const getGatewayId = ({ businessObject: { id } }) =>
    parseInt(id.split('-').pop(), 10);

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

  const handleChange = async (gateway) =>
    await actions.changeGatewayData(getGatewayId(element), gateway);

  const handleChangeDefaultBranch = (data) => {
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
    const getNextGatewayId = (element) => {
      const ids = modeler
        .get('elementRegistry')
        .getAll()
        .filter(
          ({ type, id }) =>
            gatewayElementTypes.includes(type) &&
            id !== element.businessObject.id,
        )
        .filter(({ businessObject: { id } }) => !isLocalId(id))
        .map(getGatewayId)
        .filter(Number.isInteger)
        .map(String)
        .map((id) => id.replace(workflow.id, ''))
        .map((id) => parseInt(id, 10));

      return workflow.id + padWithZeroes(minUnusedIndex(ids, 1), 3);
    };

    const loadGateway = async () => {
      const gatewayTypes =
        types ||
        (await processList.hasOrSet(
          'getGatewayTypes',
          actions.getGatewayTypes,
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
          actions.requestGateway,
          gatewayId,
        );
        if (gateway instanceof Error && gateway.message === '404 not found') {
          const gatewayTypeId = getGatewayTypeId(element, gatewayTypes);
          await actions.saveGatewayData(
            emptyGateway(gatewayId, { t, gatewayTypeId, workflow }),
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
    stringified: t(e?.name),
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
    userUnits,
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
        onChange={handleChangeAdapter(gateway, handleChangeDefaultBranch)}
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
                ...gateway?.jsonSchema?.formulas,
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

GatewayElement.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  actualGatewayList: PropTypes.object,
  element: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  gatewayTypes: PropTypes.array,
  workflow: PropTypes.object,
  selectionId: PropTypes.string,
  modeler: PropTypes.object,
  handleSave: PropTypes.bool.isRequired,
};

GatewayElement.defaultProps = {
  actualGatewayList: {},
  gatewayTypes: null,
  workflow: {},
  selectionId: null,
  modeler: null,
};

const mapStateToProps = ({
  gateways: { actual, types },
  auth: { info: userInfo, userUnits },
}) => ({
  actualGatewayList: actual,
  gatewayTypes: types,
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestGateway: bindActionCreators(requestGateway, dispatch),
    saveGatewayData: bindActionCreators(saveGatewayData, dispatch),
    changeGatewayData: bindActionCreators(changeGatewayData, dispatch),
    getGatewayTypes: bindActionCreators(getGatewayTypes, dispatch),
  },
});

const translated = translate('WorkflowAdminPage')(GatewayElement);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
