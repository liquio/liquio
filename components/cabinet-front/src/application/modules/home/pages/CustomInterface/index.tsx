import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import cleanDeep from 'clean-deep';
import objectPath from 'object-path';
import makeStyles from '@mui/styles/makeStyles';
import { Hidden, Fade } from '@mui/material';

import * as api from 'services/api';
import diff from 'helpers/diff';
import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';
import PageNotFoundRaw from 'modules/home/pages/PageNotFound';
import { Content } from 'layouts/LeftSidebar';
import EmptyPageRaw from 'components/EmptyPage';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';
import ProgressLineRaw from 'components/Preloader/ProgressLine';
import BlockScreenRaw from 'components/BlockScreenReforged';
import { requestRegisterKeyRecords } from 'actions/registry';
import { setCustomInterfaceData } from 'actions/debugTools';
import LayoutRaw from 'modules/home/pages/CustomInterface/Layout';
import TaskDetailsRaw from 'modules/home/pages/CustomInterface/TaskDetails';
import { requestExternalData } from 'application/actions/externalReader';
import { history } from 'store';
import processList from 'services/processList';
import checkAccess from 'helpers/checkAccess';

const PageNotFound = PageNotFoundRaw as unknown as React.ComponentType<Record<string, unknown>>;
const EmptyPage = EmptyPageRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ProgressLine = ProgressLineRaw as unknown as React.ComponentType<Record<string, unknown>>;
const BlockScreen = BlockScreenRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Layout = LayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TaskDetails = TaskDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  progressLine: {
    marginBottom: 30
  }
};

const INIT_TIMEOUT = 2000;
const useStyles = makeStyles(styles);

interface CustomInterfaceEntry {
  interfaceSchema?: string;
  name?: string;
}

interface UserInfo {
  userUnits?: unknown[];
  [key: string]: unknown;
}

interface DebugTools {
  customInterface?: { data?: unknown };
}

interface CustomInterfaceProps {
  actions: {
    getInterface: (route: string) => Promise<CustomInterfaceEntry[]>;
    setCustomInterfaceData: (data: unknown) => unknown;
    requestRegisterKeyRecords: (keyId: string | number, options: unknown) => Promise<unknown>;
    requestExternalData: (params: unknown) => Promise<unknown>;
  };
  location: { pathname?: string };
  userInfo?: UserInfo;
  debugTools?: DebugTools;
}

const CustomInterface = ({
  actions = {} as CustomInterfaceProps['actions'],
  location = {} as CustomInterfaceProps['location'],
  userInfo = {} as UserInfo,
  debugTools = {} as DebugTools
}: CustomInterfaceProps) => {
  // Read at call time rather than module scope: `components/JsonSchema` is
  // a directory with a known circular-import history elsewhere in this
  // codebase, so a module-top-level cast risks a TDZ crash if this file
  // ever ends up on a cycle through it (see TYPESCRIPT.md's CodeEditDialog
  // batch notes for the same bug class) — deferring costs nothing.
  const SchemaFormLoose = SchemaForm as unknown as React.ComponentType<Record<string, unknown>>;
  const [customInterface, setCustomInterface] = React.useState<CustomInterfaceEntry[] | undefined>();
  const [value, setValue] = React.useState<Record<string, unknown>>({});
  const [fetchedData, setFetchedData] = React.useState<Record<string, unknown>>({});
  const [filters, setFilters] = React.useState<Record<string, unknown>>({});
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState<Record<string, unknown>>({});
  const [error, setError] = React.useState<unknown>(null);
  const [pending, setPendingMessage] = React.useState<Record<string, unknown>>({});
  const [filtersState, setControlFilters] = React.useState<Record<string, unknown>>({});
  const [initAwaitTimeout, setInitTimeout] = React.useState<string | null>(null);
  const [appIsStable, setAppIsStable] = React.useState(false);
  const appIsStableTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      const result = await actions.getInterface(location?.pathname as string);
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

      const { fetchData: fetchDataSchema, access } = JSON.parse(interfaceSchema) as {
        fetchData?: Record<string, { filters?: Record<string, string>; external?: boolean; serviceErrorMessage?: string; pendingMessage?: unknown; isChecking?: string; keyId?: string | number; service?: string; method?: string }>;
        access?: unknown[];
      };

      if (access && Array.isArray(access) && access.length) {
        const parsedAccess = access.map((unit) => Number(unit));
        const hasAccess = checkAccess({ userHasUnit: parsedAccess }, userInfo, userInfo.userUnits as never);
        if (!hasAccess) {
          history.push('/');
          return;
        }
      }

      if (!fetchDataSchema) return;

      const registers = Object.keys(fetchDataSchema);

      const asyncFetchData = async (regName: string) => {
        const registerData = fetchDataSchema[regName];

        const getFilters = () => {
          const mapFilters: Record<string, unknown> = {};

          if (!registerData.filters) return mapFilters;

          Object.keys(registerData.filters).forEach((name) => {
            const filterValuePath = (registerData.filters as Record<string, string>)[name];

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

        const mappedFilters = (getFilters as (documentData?: unknown) => Record<string, unknown>)(documentData);

        if (!diff(mappedFilters, filters[regName] || '')) {
          return;
        }

        const { external, serviceErrorMessage, pendingMessage, isChecking } = registerData;

        let result: unknown = {};

        const ignore = !evaluate(isChecking || '() => true', documentData);

        if (ignore) return;

        if (!external) {
          setUpdating((u) => ({
            ...u,
            [regName]: true
          }));

          result = await actions.requestRegisterKeyRecords(registerData.keyId as string | number, mappedFilters);
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
          let evaluatedErrorMessage: unknown = evaluate(serviceErrorMessage as string, result);

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
            ? result.map(({ data, updatedAt, createdAt, ...rest }: Record<string, unknown>) => ({
                ...rest,
                ...(data as object),
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

  const setFiltersState = React.useCallback((filtersActual: Record<string, unknown>) => {
    setControlFilters((f) => ({
      ...f,
      ...filtersActual
    }));
  }, []);

  const { title, layout, rightSidebar, stepDetails, showEmptyScreen } = React.useMemo(
    (): {
      title?: string;
      layout?: string;
      rightSidebar?: unknown;
      stepDetails?: { hidden?: string; title?: string; subtitle?: string; [key: string]: unknown };
      showEmptyScreen?: { title?: string; description?: string; shown?: string; icon?: string };
    } => {
      try {
        const { interfaceSchema } = customInterface?.[0] || {};

        return {
          ...(JSON.parse(interfaceSchema as string) as object),
          title: customInterface?.[0]?.name
        };
      } catch {
        return {
          layout: 'default',
          title: ''
        };
      }
    },
    [customInterface]
  );

  const details = React.useMemo(() => {
    if (!stepDetails) return null;

    const { hidden, title: detailsTitle, subtitle } = stepDetails;

    const detailsEvaluated: Record<string, unknown> = {};

    const setField = (name: string, val: unknown) => {
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
  }, [stepDetails, documentData]);

  const {
    shown,
    title: emptyTitle,
    description: emptyDescription,
    emptyIcon
  } = React.useMemo((): {
    shown?: boolean;
    title?: string;
    description?: string;
    emptyIcon?: string;
  } => {
    try {
      if (!showEmptyScreen) return { shown: false } as never;

      const emptyResponse =
        (JSON.parse((customInterface || [])[0]?.interfaceSchema || '{}') as { isAccessLimited?: boolean })
          ?.isAccessLimited || false;

      const { title: titleProp, description, shown: shownProp, icon } = showEmptyScreen;

      if (!shownProp && !emptyResponse) return { shown: false } as never;

      return {
        shown: evaluate(shownProp as string, documentData) === true || emptyResponse,
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
  }, [showEmptyScreen, documentData]);

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
    ({ accordion }: { accordion?: unknown }) => <BlockScreen customInterface={true} accordion={accordion} />,
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
                  <SchemaFormLoose
                    key={key}
                    path={[]}
                    setFiltersState={setFiltersState}
                    BlockScreen={BlockScreenMemoized}
                    stepName={title}
                    value={documentData}
                    rootDocument={{ data: documentData }}
                    schema={JSON.parse(interfaceSchema as string)}
                    onChange={handleChangeAdapter(value, setValue as never)}
                  />
                ))}
                {isPending || error ? (
                  <SchemaFormLoose
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
                  <SchemaFormLoose
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
                  <SchemaFormLoose
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

interface CustomInterfaceState {
  auth: { info: UserInfo; userUnits: unknown[] };
  debugTools: DebugTools;
}

const mapStateToProps = ({ auth: { info, userUnits }, debugTools }: CustomInterfaceState) => ({
  userInfo: {
    ...info,
    userUnits
  },
  debugTools
});

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    getInterface: (route: string) => api.get(`custom-interfaces?route=${route}`, 'GET_INTERFACE', dispatch as never),
    setCustomInterfaceData: bindActionCreators(setCustomInterfaceData, dispatch),
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch),
    requestExternalData: bindActionCreators(requestExternalData, dispatch)
  }
});

export default connect(mapStateToProps, mapDispatch)(CustomInterface as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
