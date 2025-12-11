import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import cleanDeep from 'clean-deep';
import objectPath from 'object-path';
import makeStyles from '@mui/styles/makeStyles';
import { Hidden, Fade } from '@mui/material';

import * as api from 'services/api';
import diff from 'helpers/diff';
import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';
import PageNotFound from 'modules/home/pages/PageNotFound';
import { Content } from 'layouts/LeftSidebar';
import EmptyPage from 'components/EmptyPage';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import ProgressLine from 'components/Preloader/ProgressLine';
import BlockScreen from 'components/BlockScreenReforged';
import { requestRegisterKeyRecords } from 'actions/registry';
import { setCustomInterfaceData } from 'actions/debugTools';
import Layout from 'modules/home/pages/CustomInterface/Layout';
import TaskDetails from 'modules/home/pages/CustomInterface/TaskDetails';
import { requestExternalData } from 'application/actions/externalReader';
import { history } from 'store';
import processList from 'services/processList';
import checkAccess from 'helpers/checkAccess';

const styles = {
  progressLine: {
    marginBottom: 30
  }
};

const INIT_TIMEOUT = 2000;
const useStyles = makeStyles(styles);

const CustomInterface = ({ actions, location, userInfo, debugTools }) => {
  const [customInterface, setCustomInterface] = React.useState();
  const [value, setValue] = React.useState({});
  const [fetchedData, setFetchedData] = React.useState({});
  const [filters, setFilters] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState({});
  const [error, setError] = React.useState(null);
  const [pending, setPendingMessage] = React.useState({});
  const [filtersState, setControlFilters] = React.useState({});
  const [initAwaitTimeout, setInitTimeout] = React.useState(null);
  const [appIsStable, setAppIsStable] = React.useState(false);
  const appIsStableTimer = React.useRef(null);

  const classes = useStyles();

  const documentData = React.useMemo(
    () => ({
      user: userInfo,
      filtersState,
      error,
      ...fetchedData,
      ...value
    }),
    [userInfo, fetchedData, value, filtersState, error]
  );

  React.useEffect(() => {
    if (!diff(documentData, debugTools?.customInterface?.data)) {
      return;
    }

    actions.setCustomInterfaceData({
      data: documentData,
      schema: JSON.parse(customInterface?.[0].interfaceSchema || '{}')
    });
  }, [actions, documentData, debugTools, customInterface]);

  React.useEffect(() => {
    if (!location.pathname) {
      return;
    }

    if (location.pathname.indexOf('//') >= 0) {
      history.replace(location.pathname.replaceAll('//', '/'));
      return;
    }

    const getCustomInterface = async () => {
      const result = await actions.getInterface(location?.pathname);
      setLoading(false);
      setCustomInterface(result);
    };

    getCustomInterface();
  }, [actions, location]);

  React.useEffect(() => {
    if (!customInterface) return;

    const fetchData = async () => {
      const { interfaceSchema } = customInterface[0] || {};

      if (!interfaceSchema) return;

      const { fetchData: fetchDataSchema, access } = JSON.parse(interfaceSchema);

      if (access && Array.isArray(access) && access.length) {
        const parsedAccess = access.map((unit) => Number(unit));
        const hasAccess = checkAccess({ userHasUnit: parsedAccess }, userInfo, userInfo.userUnits);
        if (!hasAccess) {
          history.push('/');
          return;
        }
      }

      if (!fetchDataSchema) return;

      const registers = Object.keys(fetchDataSchema);

      const asyncFetchData = async (regName) => {
        const registerData = fetchDataSchema[regName];

        const getFilters = () => {
          const mapFilters = {};

          if (!registerData.filters) return mapFilters;

          Object.keys(registerData.filters).forEach((name) => {
            const filterValuePath = registerData.filters[name];

            let filterValue = evaluate(filterValuePath, documentData);

            if (filterValue instanceof Error) {
              filterValue = objectPath.get(documentData, filterValuePath);
            }

            if (!filterValue && filterValue !== null) {
              mapFilters[name] = filterValuePath;
              return;
            }

            mapFilters[name] = filterValue;
          });

          return mapFilters;
        };

        const mappedFilters = getFilters(documentData);

        if (!diff(mappedFilters, filters[regName] || '')) {
          return;
        }

        const { external, serviceErrorMessage, pendingMessage, isChecking } = registerData;

        let result = {};

        const ignore = !evaluate(isChecking || '() => true', documentData);

        if (ignore) return;

        if (!external) {
          setUpdating((u) => ({
            ...u,
            [regName]: true
          }));

          result = await actions.requestRegisterKeyRecords(registerData.keyId, mappedFilters);
        } else {
          setPendingMessage((p) => ({
            ...p,
            [regName]: pendingMessage
          }));

          result = await actions.requestExternalData({
            service: registerData?.service,
            method: registerData?.method,
            filters: cleanDeep(mappedFilters)
          });
        }

        setUpdating((u) =>
          cleanDeep({
            ...u,
            [regName]: null
          })
        );

        setPendingMessage((p) =>
          cleanDeep({
            ...p,
            [regName]: null
          })
        );

        if (result instanceof Error) {
          let evaluatedErrorMessage = evaluate(serviceErrorMessage, result);

          if (evaluatedErrorMessage instanceof Error) {
            evaluatedErrorMessage = serviceErrorMessage;
          }

          setError(evaluatedErrorMessage);
        }

        setFilters((f) => ({
          ...f,
          [regName]: mappedFilters
        }));

        setFetchedData((f) => ({
          ...f,
          [regName]: Array.isArray(result)
            ? result.map(({ data, updatedAt, createdAt, ...rest }) => ({
                ...rest,
                ...data,
                updatedAt,
                createdAt
              }))
            : result
        }));
      };

      for (let i = 0; i < registers.length; i++) {
        await processList.hasOrSet('fetch_interface_data' + registers[i], async () => {
          await asyncFetchData(registers[i]);
        });
      }
    };

    waiter.addAction('fetch_interface_data', fetchData, 100);
  }, [actions, customInterface, documentData, filters, userInfo]);

  React.useEffect(
    () => () => {
      waiter.removeAction('fetch_interface_data');
      setError(null);
      setUpdating({});
      setPendingMessage({});
    },
    []
  );

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setInitTimeout('finished');
    }, INIT_TIMEOUT);

    return () => clearTimeout(timeout);
  }, []);

  const setFiltersState = React.useCallback((filtersActual) => {
    setControlFilters((f) => ({
      ...f,
      ...filtersActual
    }));
  }, []);

  const { title, layout, rightSidebar, stepDetails, showEmptyScreen } = React.useCallback(
    (() => {
      try {
        const { interfaceSchema } = customInterface[0] || {};

        return {
          ...JSON.parse(interfaceSchema),
          title: customInterface[0]?.name
        };
      } catch {
        return {
          layout: 'default',
          title: ''
        };
      }
    })(),
    [customInterface]
  );

  const details = React.useCallback(
    (() => {
      if (!stepDetails) return null;

      const { hidden, title: detailsTitle, subtitle } = stepDetails;

      const detailsEvaluated = {};

      const setField = (name, val) => {
        detailsEvaluated[name] = val instanceof Error ? stepDetails[name] : val;
      };

      if (hidden) {
        const isHidden = evaluate(hidden, documentData);
        if (isHidden) return null;
      }

      if (detailsTitle) {
        const result = evaluate(detailsTitle, documentData);
        setField('title', result);
      }

      if (subtitle) {
        const result = evaluate(subtitle, documentData);
        setField('subtitle', result);
      }

      return detailsEvaluated;
    })(),
    [stepDetails, documentData]
  );

  const {
    shown,
    title: emptyTitle,
    description: emptyDescription,
    emptyIcon
  } = React.useCallback(
    (() => {
      try {
        if (!showEmptyScreen) return false;

        const emptyResponse =
          JSON.parse((customInterface || [])[0]?.interfaceSchema || '{}')?.isAccessLimited || false;

        const { title: titleProp, description, shown: shownProp, icon } = showEmptyScreen;

        if (!shownProp && !emptyResponse) return false;

        return {
          shown: evaluate(shownProp, documentData) === true || emptyResponse,
          title: titleProp,
          description,
          emptyIcon: icon
        };
      } catch {
        return {
          shown: false,
          title: '',
          description: '',
          emptyIcon: ''
        };
      }
    })(),
    [showEmptyScreen, documentData]
  );

  const Icon = emptyIcon
    ? () => <img src={`/img/emptyScreens/${emptyIcon}.svg`} alt={emptyIcon} />
    : null;

  const isPending = React.useMemo(() => Object.keys(pending).length > 0, [pending]);
  const isUpdating = React.useMemo(
    () => Object.keys(updating).length > 0 || !initAwaitTimeout,
    [updating, initAwaitTimeout]
  );

  const skeletonShown = React.useMemo(
    () => !customInterface || loading || isUpdating || !appIsStable,
    [customInterface, loading, isUpdating, appIsStable]
  );

  React.useEffect(() => {
    clearTimeout(appIsStableTimer.current);

    appIsStableTimer.current = setTimeout(() => {
      setAppIsStable(true);
    }, INIT_TIMEOUT);

    return () => clearTimeout(appIsStableTimer.current);
  }, [documentData]);

  const BlockScreenMemoized = React.useCallback(
    ({ accordion }) => <BlockScreen customInterface={true} accordion={accordion} />,
    []
  );

  if (!customInterface?.length && !loading) {
    return <PageNotFound />;
  }

  return (
    <Layout
      layout={layout}
      location={location}
      title={shown || skeletonShown ? '' : title}
      loading={loading}
      rightSidebar={rightSidebar}
      details={details}
    >
      {shown ? (
        <Fade in={true}>
          <div>
            <EmptyPage title={emptyTitle} description={emptyDescription} Icon={Icon} />
          </div>
        </Fade>
      ) : (
        <Content>
          {skeletonShown ? (
            <BlockScreenMemoized />
          ) : (
            <Fade in={true}>
              <div>
                {isPending ? (
                  <div className={classes.progressLine}>
                    <ProgressLine loading={true} />
                  </div>
                ) : null}
                <Hidden lgUp={true} implementation="css">
                  <TaskDetails details={details} />
                </Hidden>
                {customInterface?.map(({ interfaceSchema }, key) => (
                  <SchemaForm
                    key={key}
                    path={[]}
                    setFiltersState={setFiltersState}
                    BlockScreen={BlockScreenMemoized}
                    stepName={title}
                    value={documentData}
                    rootDocument={{ data: documentData }}
                    schema={JSON.parse(interfaceSchema)}
                    onChange={handleChangeAdapter(value, setValue)}
                  />
                ))}
                {isPending || error ? (
                  <SchemaForm
                    path={[]}
                    schema={{
                      type: 'object',
                      properties: {
                        style: {
                          control: 'text.block',
                          htmlBlock:
                            '<style>.fop-blocked-descr {font-size: 20px;line-height: 24px;margin-bottom: 26px;}.info-block {display: inline-flex;background: #FFF4D7;padding: 30px 52px 34px 18px;margin-bottom: 50px;vertical-align: top;margin-top: 0;line-height: 24px;}.info-block-icon {font-size: 38px; margin-bottom: 15px;font-size: 38px;padding: 0px 17px 0px 0px;margin: 0px;}.info-block p {margin: 0;}</style>'
                        }
                      }
                    }}
                  />
                ) : null}
                {isPending ? (
                  <SchemaForm
                    path={[]}
                    schema={{
                      type: 'object',
                      properties: {
                        pending: {
                          control: 'text.block',
                          htmlBlock: `<p class='info-block'>${Object.values(pending).join(',')}</p>`
                        }
                      }
                    }}
                  />
                ) : null}
                {error ? (
                  <SchemaForm
                    path={[]}
                    schema={{
                      type: 'object',
                      properties: {
                        warning: {
                          control: 'text.block',
                          htmlBlock: `
                                    <div class='fop-blocked-descr div-flex'>
                                      <p class="info-block-icon">🤷🏻‍♂</p>
                                      <p>${error}</p>
                                    </div>
                                  `
                        }
                      }
                    }}
                  />
                ) : null}
              </div>
            </Fade>
          )}
        </Content>
      )}
    </Layout>
  );
};

CustomInterface.propTypes = {
  actions: PropTypes.object,
  location: PropTypes.object,
  userInfo: PropTypes.object,
  debugTools: PropTypes.object
};

CustomInterface.defaultProps = {
  actions: {},
  location: {},
  userInfo: {},
  debugTools: {}
};

const mapStateToProps = ({ auth: { info, userUnits }, debugTools }) => ({
  userInfo: {
    ...info,
    userUnits
  },
  debugTools
});

const mapDispatch = (dispatch) => ({
  actions: {
    getInterface: (route) => api.get(`custom-interfaces?route=${route}`, 'GET_INTERFACE', dispatch),
    setCustomInterfaceData: bindActionCreators(setCustomInterfaceData, dispatch),
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch),
    requestExternalData: bindActionCreators(requestExternalData, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatch)(CustomInterface);
