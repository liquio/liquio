import React from 'react';
import { PropTypes } from 'prop-types';
import { useTranslate } from 'react-translate';
import { useSelector, useDispatch } from 'react-redux';
import objectPath from 'object-path';
import makeStyles from '@mui/styles/makeStyles';
import evaluate from 'helpers/evaluate';
import { requestExternalData } from 'application/actions/externalReader';
import { updateTaskDocumentValues } from 'application/actions/task';
import processList from 'services/processList';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ProgressLine from 'components/Preloader/ProgressLine';
import RenderFields from './components/renderFields';
import UserInputFields from './components/userInputFields';
import { updateVerifiedUserInfo } from 'actions/task';
import queueFactory from 'helpers/queueFactory';

const styles = (theme) => ({
  headline: {
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 56,
    lineHeight: '64px',
    color: '#000000',
    marginBottom: 57,
  },
  contentWrapper: {
    maxWidth: 640,
    marginBottom: 30,
    padding: 2,
    position: 'relative',
    boxShadow: 'none',
    backgroundSize: '200% 300%',
    backgroundImage:
      'linear-gradient(217deg, rgba(255, 0, 0, 0.8), rgba(255, 0, 0, 0) 70.71%), linear-gradient(127deg, rgba(0, 0, 255, 0.8), rgba(0, 0, 255, 0) 70.71%), linear-gradient(336deg, rgba(0, 255, 0, 0.8), rgba(0, 255, 0, 0) 70.71%)',
  },
  materialWrapper: {
    maxWidth: 640,
  },
  content: {
    padding: '26px 32px',
    background: 'rgb(255, 255, 255)',
  },
  centerMarginBottom: {
    marginBottom: 80,
    '& > div': {
      padding: '26px 24px',
      display: 'flex',
      maxWidth: 640,
    },
  },
  contentHeadline: {
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 18,
    lineHeight: '28px',
    color: '#000000',
    marginBottom: 24,
    letterSpacing: '-0.02em',
    wordBreak: 'break-word',
  },
  contentText: {
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 12,
    lineHeight: '16px',
    color: '#000000',
    marginBottom: 3,
    letterSpacing: '-0.02em',
    color: '#444444',
    wordBreak: 'break-word',
    ...(theme?.contentText || {}),
  },
  contentTextValue: {
    fontStyle: 'normal',
    fontWeight: 300,
    fontSize: 16,
    lineHeight: '24px',
    color: '#000000',
    marginBottom: 24,
    letterSpacing: '-0.02em',
    wordBreak: 'break-word',
  },
  flexWrapper: {
    display: 'flex',
    '& > div': {
      width: '50%',
    },
  },
  infoBlockHeadline: {
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 24,
    lineHeight: '28px',
    color: '#000000',
    marginBottom: 24,
    letterSpacing: '-0.02em',
    wordBreak: 'break-word',
  },
  infoBlockHeadlinePassport: {
    marginTop: 70,
    marginBottom: 40,
  },
  attentionWrapperBlock: {
    maxWidth: 640,
    display: 'inline-flex',
    padding: '26px 24px',
    paddingLeft: 0,
  },
  attentionWrapper: {
    background: 'rgb(255, 244, 215)',
    padding: '26px 24px',
  },
  attentionText: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 300,
    lineHeight: '24px',
  },
  progressLine: {
    height: 2,
  },
  labelText: {
    ...(theme?.labelText || {}),
  },
  border: {
    borderBottom: '1px solid #e1e7f3',
  },
});

const useStyles = makeStyles(styles);

let timeout = null;

const PASSPORT_FIELDS_COUNT = 2;
const ADDRESS_FIELDS_COUNT = 3;

const VerifiedUserInfo = (props) => {
  const {
    hidden,
    value,
    sample,
    required,
    error,
    errors,
    width,
    maxWidth,
    noMargin,
    stepName,
    path,
    taskId,
    handleStore,
    actions,
    hiddenFields,
    template,
    checkIndex,
    schema,
    readOnly,
    rootDocument,
    task: { isEntry, documentId, id },
    notRequiredLabel,
  } = React.useMemo(() => props, [props]);

  const queue = React.useRef(null);

  const t = useTranslate('VerifiedUserInfo');
  const dispatch = useDispatch();
  const classes = useStyles();
  const [loading, setLoading] = React.useState(false);
  const userInfo = useSelector((state) => state.auth);
  const [readerError, setError] = React.useState(null);
  const [dataActualized, setDataActualized] = React.useState(false);

  const calculatedFields = React.useMemo(() => {
    const calculateFieldsFunc = schema?.calculateFields || null;
    if (calculateFieldsFunc) {
      let calculateFields = evaluate(calculateFieldsFunc, rootDocument.data);
      if (calculateFields instanceof Error) {
        calculateFields = schema.fields;
      }
      return calculateFields;
    }
    return schema.fields;
  }, [schema, rootDocument.data]);

  const verifiedFields = React.useMemo(() => {
    return (
      Object.keys(value?.verified || {}).filter(
        (key) => value?.verified[key] && calculatedFields.includes(key),
      ) || []
    );
  }, [value]);

  const unVerifiedFields = React.useMemo(() => {
    return (
      Object.keys(value?.verified || {}).filter(
        (key) => !value?.verified[key] && calculatedFields.includes(key),
      ) || []
    );
  }, [value]);

  const citizenShipExists = React.useMemo(() => {
    return ['idCard', 'passport', undefined].includes(value?.passport?.type);
  }, [value]);

  const isBirthdayCountry = React.useMemo(() => {
    return (
      calculatedFields?.includes('birthday') &&
      !value?.verified?.birthday &&
      !hiddenFields?.includes('birthday.country')
    );
  }, [value, hiddenFields]);

  const isBirthdayPlace = React.useMemo(() => {
    return (
      calculatedFields?.includes('birthday') &&
      !value?.verified?.birthday &&
      !hiddenFields?.includes('birthday.place')
    );
  }, [value, hiddenFields]);

  const unVerifiedFieldsWithCitizenShip = React.useMemo(() => {
    const newFields = unVerifiedFields;
    if (!citizenShipExists) {
      newFields.push('citizenship');
    }
    if (isBirthdayCountry) {
      newFields.push('birthdayCountry');
    }
    if (isBirthdayPlace) {
      newFields.push('birthdayPlace');
    }
    return newFields;
  }, [citizenShipExists, isBirthdayCountry, isBirthdayPlace, unVerifiedFields]);

  const handleUpdateField = React.useCallback(
    async (name, val) => {
      if (readOnly) return;

      clearTimeout(timeout);

      await dispatch(
        updateTaskDocumentValues(
          taskId || id,
          [stepName, path].concat(name),
          val,
          template?.jsonSchema?.calcTriggers || [],
          schema || {},
        ),
      );

      timeout = setTimeout(async () => {
        await processList.hasOrSet('handleUpdateFieldUserInfo', () =>
          handleStore(),
        );
      }, actions.getSavingInterval());
    },
    [
      dispatch,
      taskId,
      id,
      path,
      handleStore,
      actions,
      schema,
      template,
      stepName,
    ],
  );

  const handleCallIndexReader = React.useCallback(
    async (inputValue) => {
      if (!checkIndex || !inputValue || inputValue.length !== 5) return;

      const filtersToEval = {
        cityKATOTTGCode:
          "(address) => {if (address?.region?.type === '1') return address?.region?.code;if (address.city?.type !== '2') return address?.city?.code;if (address?.district) return address?.district?.code};",
        streetName: 'street.name',
        streetType:
          "(address) => {const type = address?.street?.type;if (type === '1') return 'вул.';if (type === '2') return 'пл.';if (type === '3') return 'бульв.';if (type === '4') return 'просп.';if (type === '5') return 'пров.';return 'інший'};",
        houseNumber:
          '(address) => {const building = !!address?.building?.value && address?.building?.value.trim() ? address?.building?.value : "";const korp = !!address?.korp?.value && address?.korp?.value.trim() ? "КОРП" + address?.korp?.value : "";return building + korp};',
      };

      const mapFilters = {};

      Object.keys(filtersToEval).forEach((name) => {
        const currentFilter = filtersToEval[name];

        let filterValue = evaluate(currentFilter, value?.address);

        if (filterValue instanceof Error) {
          filterValue = objectPath.get(value?.address, currentFilter);
        }

        mapFilters[name] = filterValue;
      });

      setError(null);

      actions.setBusy(true);

      const result = await dispatch(
        requestExternalData({
          service: 'ukrposhta',
          method: 'get-post-code',
          filters: mapFilters,
        }),
      );

      actions.setBusy(false);

      if (result instanceof Error) {
        const errorMessage = result.message;
        const addressNotFound = errorMessage.includes('500100');
        setError(addressNotFound ? 'indexErrorTextUnExists' : result.message);
        handleUpdateField('checkIndex', addressNotFound ? 'valid' : 'invalid');
        return;
      }

      const { data, status, error } = result;

      if (
        error &&
        ['1000', '1001', '1010', '1011', '1012', '1013', '1014'].includes(
          error + '',
        )
      ) {
        setError('indexErrorTextUnExists');
        handleUpdateField('checkIndex', 'valid');
        return;
      }

      if (status !== 'success' || data !== inputValue) {
        handleUpdateField('checkIndex', 'invalid');
        setError('indexErrorText');
        return;
      }

      handleUpdateField('checkIndex', 'valid');
    },
    [dispatch, value, checkIndex, handleUpdateField, actions],
  );

  const controlPath = React.useMemo(
    () => [stepName].concat(path),
    [stepName, path],
  );

  const isUnverifiedFieldFilled = React.useCallback(() => {
    const filled = unVerifiedFields.filter((field) => {
      if (field === 'passport') {
        return Object.keys(value[field] || {}).length >= PASSPORT_FIELDS_COUNT;
      }

      if (field === 'address') {
        return Object.keys(value[field] || {}).length >= ADDRESS_FIELDS_COUNT;
      }

      if (field === 'birthday') {
        return !!value[field]?.date;
      }

      return !!value[field]?.value;
    });

    const isFirstTimeCall = !value?.dataActualized;

    if (!isEntry && isFirstTimeCall) {
      return false;
    }

    return !!filled.length;
  }, [value, unVerifiedFields, isEntry]);

  React.useEffect(() => {
    isUnverifiedFieldFilled();
  }, [isUnverifiedFieldFilled]);

  React.useEffect(() => {
    queue.current = queueFactory.get(taskId + '-registers');

    const updateVerifiedUserInfoAction = async () => {
      setLoading(true);
      setDataActualized(true);
      await dispatch(updateVerifiedUserInfo(documentId));
      await handleUpdateField('dataActualized', true);
      setLoading(false);
    };

    const ignore = isUnverifiedFieldFilled();

    if (ignore || dataActualized || readOnly) return;

    processList.hasOrSet('handleUpdateFieldUserInfo', () => {
      return queue?.current.push(() => updateVerifiedUserInfoAction());
    });
  }, [
    dispatch,
    dataActualized,
    documentId,
    handleUpdateField,
    taskId,
    isUnverifiedFieldFilled,
  ]);

  if (hidden) return null;

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      width={width}
      maxWidth={maxWidth}
      noMargin={noMargin}
    >
      {loading ? (
        <div className={classes.progressLine}>
          <ProgressLine loading={true} />
        </div>
      ) : (
        <>
          <RenderFields
            t={t}
            classes={classes}
            value={value}
            userInfo={userInfo}
            fields={verifiedFields}
            citizenShipExists={citizenShipExists}
            hiddenFields={hiddenFields}
            template={template}
            schema={schema}
          />

          <UserInputFields
            t={t}
            value={value}
            path={controlPath}
            errors={errors}
            classes={classes}
            fields={unVerifiedFieldsWithCitizenShip}
            actions={actions}
            citizenShipExists={citizenShipExists}
            stepName={stepName}
            hiddenFields={hiddenFields}
            handleCallIndexReader={handleCallIndexReader}
            readerError={readerError}
            handleUpdateField={handleUpdateField}
            template={template}
            schema={schema}
            readOnly={readOnly}
            notRequiredLabel={notRequiredLabel}
          />
        </>
      )}
    </ElementContainer>
  );
};

VerifiedUserInfo.propTypes = {
  actions: PropTypes.object.isRequired,
  stepName: PropTypes.string.isRequired,
  path: PropTypes.array.isRequired,
  taskId: PropTypes.string.isRequired,
  hidden: PropTypes.bool,
  value: PropTypes.object,
  sample: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.bool,
  width: PropTypes.number,
  maxWidth: PropTypes.number,
  noMargin: PropTypes.bool,
  errors: PropTypes.array,
  hiddenFields: PropTypes.array,
  template: PropTypes.object.isRequired,
  checkIndex: PropTypes.bool,
  schema: PropTypes.object.isRequired,
};

VerifiedUserInfo.defaultProps = {
  hidden: false,
  value: {},
  sample: false,
  required: false,
  error: false,
  width: '100%',
  maxWidth: '100%',
  noMargin: false,
  errors: [],
  hiddenFields: [],
  checkIndex: false,
};

export default VerifiedUserInfo;
