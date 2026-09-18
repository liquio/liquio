import React from 'react';
import QRCode from 'qrcode.react';
import objectPath from 'object-path';
import classNames from 'classnames';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslate } from 'react-translate';
import theme from 'theme';
import MobileDetect from 'mobile-detect';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import { Dialog, Typography, CircularProgress, Button } from '@mui/material';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ProgressLine from 'components/Preloader/ProgressLine';
import FileDataTableUntyped from 'components/FileDataTable';
import * as taskActions from 'application/actions/task';
import evaluate from 'helpers/evaluate';
import ExtReaderMessages from 'modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages';
import { ReactComponent as FullscreenIcon } from './assets/fullscreen.svg';
import { ReactComponent as ExitFullscreenIcon } from './assets/fullscreen_exit.svg';
import { ReactComponent as TimerFinishedIcon } from './assets/timerFinished.svg';
import { ReactComponent as QrExpired } from './assets/qr.svg';
import { ReactComponent as ShareIcon } from './assets/diia_share.svg';
import awaitDelay from 'helpers/awaitDelay';
import diff from 'helpers/diff';

const FileDataTable = FileDataTableUntyped as unknown as React.ComponentType<Record<string, unknown>>;

type Dispatch = (action: unknown) => unknown;
type AsyncDispatch = (thunk: unknown) => Promise<unknown>;

const externalReaderCheckData = taskActions.externalReaderCheckData as unknown as (documentId: string | number, body: unknown) => (dispatch: Dispatch) => unknown;
const loadTaskDocument = taskActions.loadTaskDocument as unknown as (documentId: string | number) => (dispatch: Dispatch) => unknown;
const loadTask = taskActions.loadTask as unknown as (taskId: string | number) => (dispatch: Dispatch) => unknown;

const { defaultLayout } = theme as unknown as { defaultLayout?: boolean };

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    border: '2px solid #000',
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: 24,
    ...(!defaultLayout
      ? {
          border: '1px solid rgba(225, 231, 243, 1)',
          borderRadius: 8,
          boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.04)',
        }
      : {}),
    [theme.breakpoints.down('sm')]: {
      padding: 16,
    },
  },
  disableBoxShadow: {
    boxShadow: 'none',
  },
  fullscreen: {
    border: 'none',
  },
  description: {
    fontSize: 18,
    lineHeight: '24px',
    marginBottom: 16,
    [theme.breakpoints.down('sm')]: {
      textAlign: 'center' as const,
      fontSize: 16,
      marginBottom: 8,
      maxWidth: 256,
    },
  },
  actionText: {
    fontSize: 12,
    lineHeight: '16px',
    marginBottom: 8,
    textAlign: 'center' as const,
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
  showSm: {
    display: 'none',
    [theme.breakpoints.down('sm')]: {
      display: 'block',
      fontSize: 14,
    },
  },
  qrCode: {
    width: 220,
    height: 220,
    marginBottom: 24,
  },
  icon: {
    marginRight: 10,
    marginLeft: 5,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
  renewButton: {
    padding: '10px 28px',
    fontSize: 13,
    lineHeight: '16px',
    [theme.breakpoints.down('sm')]: {
      marginBottom: 16,
    },
  },
  timerWrapper: {
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    [theme.breakpoints.down('sm')]: {
      marginBottom: 16,
    },
    '& > p': {
      paddingLeft: 8,
      color: 'rgba(0, 122, 100, 1)',
      [theme.breakpoints.down('sm')]: {
        fontWeight: 500,
      },
    },
  },
  timerLow: {
    color: 'rgba(176, 16, 56, 1)',
    '& > p': {
      color: 'rgba(176, 16, 56, 1)',
    },
  },
  toolbarFullScreen: {
    marginBottom: 160,
  },
  relative: {
    position: 'relative' as const,
  },
  timerReached: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenButton: {
    backgroundColor: 'transparent',
    ...(!defaultLayout
      ? {
          color: 'rgba(0, 104, 255, 1)',
          '& svg path': {
            fill: 'rgba(0, 104, 255, 1)',
          },
        }
      : {}),
  },
  filesWrapper: {
    marginTop: 24,
  },
  fillIcon: {
    color: '#fff',
  },
  initActionWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  loadManualText: {
    fontSize: 14,
    marginTop: 16,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    '&:before': {
      content: '""',
      display: 'block',
      width: 65,
      height: 1,
      backgroundColor: '#B7D5FF',
      [theme.breakpoints.down('sm')]: {
        display: 'none',
      },
    },
    '&:after': {
      content: '""',
      display: 'block',
      width: 65,
      height: 1,
      backgroundColor: '#B7D5FF',
      [theme.breakpoints.down('sm')]: {
        display: 'none',
      },
    },
  },
  timerReachedColor: {
    color: '#767676',
    '& > p': {
      color: '#767676',
    },
  },
}));

const RENEW_TIMER = 180;
const LISTEN_INTERVAL = 10000;

interface PieProgressIndicatorProps {
  progress: number;
  expiring: boolean;
  size?: number;
}

const PieProgressIndicator = ({ progress, expiring, size = 200 }: PieProgressIndicatorProps) => {
  const halfSize = size / 2;
  const radius = halfSize;
  const angle = (progress / 100) * 360;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, startAngle);
    const end = polarToCartesian(x, y, radius, endAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${x},${y}`,
      `L ${start.x},${start.y}`,
      `A ${radius},${radius} 0 ${largeArcFlag} 1 ${end.x},${end.y}`,
      'Z',
    ].join(' ');
  };

  const arcPath = describeArc(halfSize, halfSize, radius, 0, angle);

  const circleColor = expiring
    ? 'rgba(176, 16, 56, 1)'
    : 'rgba(0, 122, 100, 1)';

  return (
    <svg width={size} height={size}>
      <circle cx={halfSize} cy={halfSize} r={radius} fill={circleColor} />
      <path d={arcPath} fill={'#fff'} />
    </svg>
  );
};

interface DocumentSharingReaderSchema {
  filters?: string[];
  serviceErrorMessage?: string;
  service?: string;
  method?: string;
  path?: string;
}

interface DocumentSharingProps {
  description?: string;
  sample?: string;
  required?: boolean;
  error?: unknown;
  actions: { handleDownloadFile?: unknown };
  task: { documentId: string | number; id: string | number; document: { data: Record<string, unknown> } };
  linkReader: string;
  hidden?: boolean;
  ownFilesList?: boolean;
  [key: string]: unknown;
}

const DocumentSharing = (props: DocumentSharingProps) => {
  const {
    description,
    sample,
    required,
    error,
    actions,
    task: { documentId },
    linkReader,
    hidden,
    task: { id: taskId, document },
    ownFilesList = false,
  } = props;
  const t = useTranslate('Elements');
  const classes = useStyles();
  const dispatch = useDispatch() as unknown as AsyncDispatch;

  const [deepLink, setDeepLink] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [timer, setTimer] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [requestError, setError] = React.useState<unknown>(null);
  const [attachments, setAttachments] = React.useState<unknown[] | null>(null);
  const [savedFilters, setSavedFilters] = React.useState<unknown[] | null>(null);
  const interval = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const readerSchema: DocumentSharingReaderSchema | undefined = React.useMemo(
    () => props[linkReader] as DocumentSharingReaderSchema | undefined,
    [props, linkReader],
  );

  const filters = React.useMemo(
    () => readerSchema?.filters || [],
    [readerSchema],
  );

  const fileStorage = useSelector(({ files: { list } }: { files: { list: Record<string, unknown> } }) => list);

  const setExternalErrorMessage = React.useCallback(
    (result: { message?: string }) => {
      if (!readerSchema?.serviceErrorMessage) {
        setError(result.message);
        return;
      }

      let evaluatedErrorMessage: unknown = evaluate(
        readerSchema?.serviceErrorMessage,
        result,
      );

      if (evaluatedErrorMessage instanceof Error) {
        evaluatedErrorMessage = readerSchema?.serviceErrorMessage;
      }

      setError(evaluatedErrorMessage);
    },
    [readerSchema],
  );

  const listenAction = React.useCallback(async () => {
    const result = (await dispatch(loadTaskDocument(documentId))) as { attachments?: Array<{ meta?: { createdByProvider?: string } }> } | Error;

    if (result instanceof Error) {
      if (interval.current) clearInterval(interval.current);
      setLoading(false);
      setExternalErrorMessage(result);
      return;
    }

    const documents = (result?.attachments || []).filter(
      (item) => item?.meta?.createdByProvider === 'diiaShareProvider',
    );

    setAttachments(documents);

    if ((documents || []).length) {
      if (interval.current) clearInterval(interval.current);
      await awaitDelay(1000);
      await dispatch(loadTask(taskId));
      setPending(false);
    }
  }, [dispatch, documentId, taskId, setExternalErrorMessage]);

  const listedCallback = React.useCallback(
    (silent?: boolean) => {
      if (silent) {
        interval.current = setInterval(() => {
          listenAction();
        }, 3 * LISTEN_INTERVAL);
        return;
      }

      setPending(true);

      setTimeout(() => {
        listenAction();
        interval.current = setInterval(() => {
          listenAction();
        }, LISTEN_INTERVAL);
      }, 3 * LISTEN_INTERVAL);
    },
    [listenAction, interval],
  );

  const fetchData = React.useCallback(async () => {
    if (loading) return;

    setError(null);

    setLoading(true);

    const body = {
      service: readerSchema?.service,
      method: readerSchema?.method,
      path: readerSchema?.path,
    };

    const result = (await dispatch(externalReaderCheckData(documentId, body))) as { data?: unknown; message?: string } | Error;

    if (result instanceof Error) {
      setLoading(false);
      setExternalErrorMessage(result);
      return;
    }

    const response = objectPath.get(result?.data, readerSchema?.path as string) as { deeplink?: string };

    setTimer(0);
    setDeepLink(response.deeplink || null);
    setLoading(false);
    listedCallback();
  }, [
    loading,
    dispatch,
    readerSchema,
    documentId,
    setExternalErrorMessage,
    listedCallback,
  ]);

  const onClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const toggleFullScreen = React.useCallback(() => {
    setOpen(!open);
  }, [open]);

  const handleRedirect = React.useCallback(() => {
    if (isMobile) {
      window.open(
        `https://diia.page.link?link=${deepLink}&apn=ua.gov.diia.app&isi=1489717872&ibi=ua.gov.diia.app`,
        '_blank',
      );
      return;
    }
    window.open(deepLink as string, '_blank');
  }, [deepLink, isMobile]);

  const ControlContent = React.useCallback(() => {
    const timerValue = (() => {
      const formatted = moment
        .utc((RENEW_TIMER - timer) * 1000)
        .format('mm:ss');
      return formatted;
    })();

    const percentage = Math.floor((timer / RENEW_TIMER) * 100);

    const expiring = timer >= RENEW_TIMER - 30;

    const timerReached = timerValue === '00:00';

    if (timerReached && pending) {
      setPending(false);
    }

    return (
      <div
        className={classNames({
          [classes.root]: true,
          [classes.disableBoxShadow]: open,
          [classes.fullscreen]: open,
        })}
      >
        <div
          className={classNames({
            [classes.toolbar]: true,
            [classes.toolbarFullScreen]: open,
          })}
        >
          <Button
            startIcon={
              open ? (
                <ExitFullscreenIcon className={classes.icon} />
              ) : (
                <FullscreenIcon className={classes.icon} />
              )
            }
            onClick={toggleFullScreen}
            className={classes.fullscreenButton}
          >
            {t(open ? 'ExitFullScreen' : 'OnFullScreen')}
          </Button>
        </div>

        <Typography className={classes.description}>
          {timerReached ? (
            t(isMobile ? 'CodeInActive' : 'QrInActive')
          ) : (
            <>{description || t('DiiaShare')}</>
          )}
        </Typography>

        <div
          className={classNames({
            [classes.timerWrapper]: true,
            [classes.timerLow]: expiring,
            [classes.timerReachedColor]: timerReached,
          })}
        >
          {timerReached ? null : (
            <PieProgressIndicator
              progress={percentage}
              size={20}
              expiring={expiring}
            />
          )}
          <Typography>
            {t(isMobile ? 'TimeLeft' : 'TimeQrLeft', { time: timerValue })}
          </Typography>
        </div>

        {!timerReached ? (
          <>
            <Typography className={classes.actionText}>
              {t('ScanQR')}
            </Typography>
            {isMobile ? (
              <Typography
                className={classNames({
                  [classes.actionText]: true,
                  [classes.showSm]: true,
                })}
              >
                {t('ClickQR')}
              </Typography>
            ) : null}
          </>
        ) : null}

        <div className={classes.relative}>
          {timerReached ? (
            <>
              <QrExpired />
              <div className={classes.timerReached}>
                <TimerFinishedIcon />
                <Typography className={classes.timerLow}>
                  {t('TimerFinished')}
                </Typography>
              </div>
            </>
          ) : (
            <>
              <QRCode
                value={deepLink || ''}
                className={classes.qrCode}
                renderAs={'svg'}
                onClick={handleRedirect}
              />
            </>
          )}
        </div>

        <Button
          variant={defaultLayout ? 'outlined' : 'contained'}
          className={classes.renewButton}
          onClick={fetchData}
          startIcon={
            loading ? (
              <CircularProgress className={classes.fillIcon} size={16} />
            ) : null
          }
        >
          {t(isMobile ? 'RenewCode' : 'RenewQr')}
        </Button>
      </div>
    );
  }, [
    classes,
    deepLink,
    description,
    handleRedirect,
    toggleFullScreen,
    timer,
    open,
    t,
    fetchData,
    loading,
    isMobile,
    pending,
  ]);

  React.useEffect(() => {
    if (!deepLink) return;

    const timerListener = setTimeout(() => {
      setTimer(timer + 1);
    }, 1000);

    if (timer >= RENEW_TIMER) {
      clearTimeout(timerListener);
      if (interval.current) clearInterval(interval.current);
    }

    return () => {
      clearTimeout(timerListener);
    };
  }, [timer, deepLink, interval]);

  React.useEffect(() => {
    listenAction();
  }, [listenAction]);

  React.useEffect(() => {
    const mapFilters = Object.values(filters).map((filter) => {
      return objectPath.get(document.data, filter);
    });

    if (!diff(savedFilters, mapFilters)) {
      return;
    }

    setSavedFilters(mapFilters);

    setTimer(0);
    setDeepLink(null);
    setLoading(false);
    setPending(false);
    setError(null);
    listedCallback(true);
  }, [document, listedCallback, savedFilters, filters]);

  if (hidden) return null;

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error}
      maxWidth={deepLink ? '100%' : 440}
    >
      {deepLink ? (
        <ControlContent />
      ) : (
        <div className={classes.initActionWrapper}>
          <Button
            variant={'contained'}
            onClick={fetchData}
            startIcon={
              loading ? (
                <CircularProgress className={classes.fillIcon} size={24} />
              ) : !defaultLayout ? (
                <ShareIcon />
              ) : null
            }
          >
            {t('DiiaShare')}
          </Button>
          <div className={classes.loadManualText}>{t('UploadManual')}</div>
        </div>
      )}

      {(attachments || []).length && ownFilesList ? (
        <div className={classes.filesWrapper}>
          <FileDataTable
            data={attachments}
            fileStorage={fileStorage}
            actions={{
              handleDownloadFile: actions.handleDownloadFile,
            }}
          />
        </div>
      ) : null}

      {pending ? (
        <div className={classes.filesWrapper}>
          <ProgressLine loading={true} />
        </div>
      ) : null}

      {requestError ? (
        <div className={classes.filesWrapper}>
          <ExtReaderMessages externalReaderErrors={[requestError]} />
        </div>
      ) : null}

      <Dialog open={open} onClose={onClose} fullScreen={true} fullWidth={true}>
        <ControlContent />
      </Dialog>
    </ElementContainer>
  );
};

export default DocumentSharing;
