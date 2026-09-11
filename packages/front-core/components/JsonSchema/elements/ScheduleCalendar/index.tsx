import React from 'react';
import moment from 'moment-timezone';
import { useDispatch } from 'react-redux';
import objectPath from 'object-path';
import { useTranslate } from 'react-translate';
import cleenDeep from 'clean-deep';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import * as registryActions from 'application/actions/registry';
import processList from 'services/processList';
import evaluate from 'helpers/evaluate';
import DisclaimerUntyped from 'components/Disclaimer';
import ProgressLine from 'components/Preloader/ProgressLine';
import waiter from 'helpers/waitForAction';
import flatten from 'helpers/flatten';
import renderHTML from 'helpers/renderHTML';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import { requestExternalData } from 'application/actions/externalReader';
import { ReactComponent as IconClose } from './assets/ic_close_big.svg';
import RenderSchedule from './renderSchedule';

const Disclaimer = DisclaimerUntyped as unknown as React.ComponentType<Record<string, unknown>>;

type Dispatch = (action: unknown) => unknown;
// requestRegisterKeyRecords/requestRegisterKeyRecordsFilter are only exported by
// cabinet-front's application/actions/registry; admin-front's copy lacks them, so
// they are resolved dynamically to keep this file shared between both apps.
const requestRegisterKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecords;
const requestRegisterKeyRecordsFilter = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterKeyRecordsFilter;

const DISABLED_STATUS = 'disabled';
const UTC_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss.SSZ';
const useStyles = makeStyles((theme: Theme) => ({
  button: {
    padding: '16px 20px',
    marginRight: 8,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 16,
      width: '100%',
      marginRight: 0,
      marginLeft: '0!important',
      fontSize: 13,
      padding: 12,
      height: 48
    }
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 0
  },
  dialogContent: {
    marginBottom: 30,
    paddingLeft: 56,
    paddingRight: 56,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 30,
      paddingRight: 30,
      marginBottom: 0
    }
  },
  dialogActions: {
    justifyContent: 'flex-start',
    marginBottom: 72,
    paddingLeft: 56,
    paddingRight: 56,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 30,
      paddingRight: 30,
      marginBottom: 40,
      flexWrap: 'wrap' as const
    }
  },
  paperWidth: {
    maxWidth: 736
  }
}));

interface WorkingHoursEntry {
  workingDays: string;
  workingHoursFrom: string;
  workingHoursTo: string;
  [key: string]: unknown;
}

const getNonWorkingHours = (workingHours: WorkingHoursEntry[]) => {
  const allDays = ['понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота', 'неділя'];
  const nonWorkingHours: WorkingHoursEntry[] = [];

  function compareTime(a: string, b: string) {
    return a.localeCompare(b);
  }

  const groupedByDay = workingHours.reduce((acc: Record<string, WorkingHoursEntry[]>, entry) => {
    if (!acc[entry.workingDays]) acc[entry.workingDays] = [];
    acc[entry.workingDays].push(entry);
    acc[entry.workingDays].sort((a, b) => compareTime(a.workingHoursFrom, b.workingHoursFrom));
    return acc;
  }, {});

  allDays.forEach((day) => {
    const workingPeriods = groupedByDay[day] || [];
    let start = '00:00';

    workingPeriods.forEach((period) => {
      if (compareTime(start, period.workingHoursFrom) < 0) {
        nonWorkingHours.push({
          workingDays: day,
          workingHoursFrom: start,
          workingHoursTo: period.workingHoursFrom
        });
      }
      start = period.workingHoursTo;
    });

    if (compareTime(start, '24:00') < 0) {
      nonWorkingHours.push({
        workingDays: day,
        workingHoursFrom: start,
        workingHoursTo: '24:00'
      });
    }
  });

  return nonWorkingHours;
};

interface ScheduleCalendarProps {
  description?: string;
  sample?: string;
  required?: boolean;
  error?: string;
  keyId?: number | null;
  onChange: (value: unknown) => void;
  value?: Record<string, unknown>;
  filters?: Array<{ name: string; value: string }>;
  rootDocument: { id?: string | number; data: Record<string, unknown> };
  path?: Array<string | number>;
  minDate?: string;
  maxDate?: string;
  stepName?: string | null;
  slotInterval?: string | boolean;
  timeSlotsSource?: string;
  disabledTimeSlots?: string;
  groupBy?: string;
  additionalFilter?: string | null;
  originDocument: { id?: string | number; [key: string]: unknown };
  scheduleEndDate?: string;
  additionalDisabledSlots?: string;
  readOnly?: boolean;
  additionFields?: string[];
  dataPath?: string | null;
  toggleDisabled?: boolean;
  notFoundMessage?: string | null;
  handleOpenDialog?: string | null;
  hidden?: boolean;
  dialogActions?: string | null;
  choseAllDay?: boolean;
  taskId?: string | null;
  startDayMove?: number;
  holidays?: string | null;
  timeZone?: string | null;
  shiftChose?: boolean;
  chosenStatusExtend?: string | null;
  fixedSLotInterval?: boolean;
  search?: string | null;
  indexedSort?: Record<string, unknown>;
  invertTime?: boolean;
  service?: string;
  method?: string;
  ignoreTimezone?: boolean;
  slotsText?: unknown;
  ignoreSlotInterval?: boolean;
  isConsuleCalendar?: boolean;
  ignoreVisitPast?: boolean;
  additionalDisabledSlotsRequest?: string;
  serviceNumber?: string | null;
  availableServices?: string;
}

const ScheduleCalendar = ({
  description = '',
  sample = '',
  required = false,
  error = '',
  keyId = null,
  onChange,
  value = {},
  filters = [],
  rootDocument,
  path = [],
  minDate = '(moment) => moment()',
  maxDate = '(moment) => moment().add(7, "days")',
  stepName,
  slotInterval = '() => 15',
  timeSlotsSource = 'receptionCitizensTime',
  disabledTimeSlots = 'nonWorkingTime',
  groupBy = 'consulIpn',
  additionalFilter = null,
  originDocument,
  scheduleEndDate = 'admissionSchedulePeriodDate',
  additionalDisabledSlots = '() => []',
  readOnly = false,
  additionFields = [],
  dataPath = null,
  toggleDisabled = false,
  notFoundMessage = null,
  handleOpenDialog = null,
  hidden = false,
  dialogActions = null,
  choseAllDay = false,
  taskId = null,
  startDayMove = 0,
  holidays = null,
  timeZone = null,
  shiftChose = false,
  chosenStatusExtend = null,
  fixedSLotInterval = true,
  search = null,
  indexedSort = {},
  invertTime = false,
  service = '',
  method = '',
  ignoreTimezone = false,
  slotsText,
  ignoreSlotInterval = false,
  isConsuleCalendar,
  ignoreVisitPast,
  additionalDisabledSlotsRequest,
  serviceNumber = null,
  availableServices = 'consularInstitutionService'
}: ScheduleCalendarProps) => {
  const { id: originDocumentId } = originDocument;
  const { id: rootDocumentId } = rootDocument;
  const t = useTranslate('ScheduleCalendar');
  const [generating, setGenerating] = React.useState(false);
  const [dialog, setDialog] = React.useState<unknown>(false);
  const [scheduleDays, setScheduleDays] = React.useState<Record<string, unknown[]>>({});
  const [notWorkingDays, setNotWorkingDays] = React.useState<unknown[]>([]);
  const [fetchError, setError] = React.useState<string | null>(null);
  const [userGeneratedDays, setUserGeneratedDays] = React.useState<unknown[]>([]);
  const [availableSlotsExist, setAvailableSlotsExist] = React.useState<boolean | null>(null);
  const dispatch = useDispatch() as unknown as (action: unknown) => Promise<unknown>;
  const classes = useStyles();

  const minDateEval = React.useMemo(() => {
    if (!minDate) return moment();

    return evaluate(minDate, moment, value, rootDocument.data[stepName as string], rootDocument.data) as moment.Moment;
  }, [minDate, value, rootDocument, stepName]);

  const maxDateEval = React.useMemo(() => {
    if (!maxDate) return moment().add(7, 'days');

    return evaluate(maxDate, moment, value, rootDocument.data[stepName as string], rootDocument.data) as moment.Moment;
  }, [maxDate, value, rootDocument, stepName]);

  const holidaysEval = React.useMemo(() => {
    if (!holidays) return [];

    return evaluate(holidays, moment, value, rootDocument.data[stepName as string], rootDocument.data) as unknown[];
  }, [holidays, value, rootDocument, stepName]);

  const slotIntervalEval = React.useMemo(() => {
    if (!slotInterval) return 15;

    return evaluate(slotInterval as string, moment, value, rootDocument.data[stepName as string], rootDocument.data) as number;
  }, [slotInterval, value, rootDocument, stepName]);

  const disabledSlotsEval = React.useMemo(() => {
    if (!additionalDisabledSlots) return [];

    return evaluate(
      additionalDisabledSlots,
      moment,
      value,
      rootDocument.data[stepName as string],
      rootDocument.data
    ) as unknown[];
  }, [additionalDisabledSlots, value, rootDocument, stepName]);

  const notFoundMessageEval = React.useMemo(() => {
    if (!notFoundMessage) return null;

    const messageEvaluated = evaluate(
      notFoundMessage,
      moment,
      value,
      rootDocument.data[stepName as string],
      rootDocument.data
    );

    if (messageEvaluated instanceof Error) {
      return notFoundMessage;
    }

    return messageEvaluated as string;
  }, [notFoundMessage, value, rootDocument, stepName]);

  const handleOpenDialogEval = React.useMemo(() => {
    if (!handleOpenDialog) return null;

    return evaluate(handleOpenDialog, moment, dialog) as string;
  }, [handleOpenDialog, dialog]);

  const dialogActionsEval = React.useMemo(() => {
    if (!dialogActions) return [];

    return evaluate(dialogActions, moment, dialog, rootDocument.data) as Array<{ name: string; url: string; variant?: string }>;
  }, [dialogActions, dialog, rootDocument]);

  const timeZoneEval = React.useMemo(() => {
    if (!timeZone) {
      const userOffsetInMinutes = new Date().getTimezoneOffset();
      const userOffsetInHours = -userOffsetInMinutes / 60;
      return `GMT${userOffsetInHours > 0 ? '+' : ''}${userOffsetInHours}:00`;
    }

    return evaluate(timeZone, moment, value, rootDocument.data[stepName as string], rootDocument.data) as string;
  }, [timeZone, value, rootDocument, stepName]);

  const chosenStatusExtendEval = React.useCallback(
    (slot: unknown) => {
      if (!chosenStatusExtend) return null;

      return evaluate(chosenStatusExtend, slot);
    },
    [chosenStatusExtend]
  );

  const getSearchQS = React.useCallback(() => {
    let addition: Record<string, unknown> = {};

    if (search) {
      const searchQuery = evaluate(search, rootDocument.data);

      if (searchQuery instanceof Error) return {};

      if (Array.isArray(searchQuery)) {
        addition = {
          search_equal_2: searchQuery.join('||'),
          ...indexedSort
        };
      } else {
        addition = {
          search_equal: searchQuery,
          ...indexedSort
        };
      }
    }

    return addition;
  }, [search, rootDocument, indexedSort]);

  const getFilters = React.useCallback(() => {
    const filter: Record<string, unknown> = {};

    (filters || []).forEach(({ name, value: filterValue }) => {
      filter[`data_like[${name}]`] = objectPath.get(rootDocument, filterValue);
    });

    const control = (['documents', rootDocumentId || originDocumentId, stepName] as Array<string | number | null | undefined>)
      .concat(path)
      .join('.');

    filter.control = control;
    filter.limit = 100;

    return {
      ...filter,
      ...getSearchQS()
    };
  }, [filters, rootDocument, path, rootDocumentId, originDocumentId, stepName, getSearchQS]);

  const evalDate = React.useCallback(
    (daySchedule: Array<Record<string, unknown>> | undefined, notWorkingDaysProp: Array<Record<string, unknown>>) => {
      const result: Array<Record<string, unknown>> = [];

      if (!daySchedule) return result;

      daySchedule.forEach((day) => {
        const { start: from, end: to, timeZone: dayTimeZone } = day as { start: string; end: string; timeZone: string };
        const currentMoment = moment(day.currentDate as string, 'YYYY-MM-DD');
        const filterNotWorkingDays = notWorkingDaysProp.filter((period: Record<string, unknown>) => {
          const fromMoment = moment(period.notWorkingDateAndHoursFrom as string)
            .utcOffset(dayTimeZone, false)
            .format('YYYY-MM-DD');
          const toMoment = moment(period.notWorkingDateAndHoursTo as string)
            .utcOffset(dayTimeZone, false)
            .format('YYYY-MM-DD');
          return currentMoment.isSame(fromMoment, 'day') || currentMoment.isSame(toMoment, 'day');
        });

        let start;
        let end;

        if (ignoreTimezone) {
          start = moment(from.split('+')[0]);
          end = moment(to.split('+')[0]);
        } else {
          start = moment(from).utcOffset(dayTimeZone, true);
          end = moment(to).utcOffset(dayTimeZone, true);
        }

        while (start.isBefore(end)) {
          const slotEnd = start.clone().add(slotIntervalEval, 'minutes');

          if (!ignoreSlotInterval) {
            if (slotEnd.isAfter(end)) return;
          }

          const id = `${start.format()}-${slotEnd.format()}`;
          let isNotOnLeave = true;

          const isAlreadyPassed = moment().utcOffset(dayTimeZone).isAfter(start);

          const availableConsuls = (daySchedule as Array<Record<string, unknown>>).filter((consul) => {
            if (!consul?.data) return true;
            const consulData = consul.data as Record<string, unknown>;
            const consulIpnHash = consulData?.consulIpnHash;
            let workEnd = moment(`${consul.end}`).utcOffset(dayTimeZone, true);
            let workStart = moment(`${consul.start}`).utcOffset(dayTimeZone, true);
            if (ignoreTimezone) {
              workEnd = moment(`${consul.end}`);
              workStart = moment(`${consul.start}`);
            }
            const isWithinWorkingHours = invertTime
              ? true
              : workStart.isSameOrBefore(start.format()) && workEnd.isSameOrAfter(slotEnd.format());
            const nonWorkingPeriodsByConsul = filterNotWorkingDays.filter(
              (daySchedule: Record<string, unknown>) => daySchedule.consulIpnHash === consulIpnHash
            );

            isNotOnLeave = !nonWorkingPeriodsByConsul.some((period: Record<string, unknown>) => {
              return (
                slotEnd.isAfter(period.notWorkingDateAndHoursFrom as string) &&
                start.isBefore(period.notWorkingDateAndHoursTo as string)
              );
            });

            if (serviceNumber) {
              const checkServiceNumber = evaluate(serviceNumber, rootDocument.data);
              if (checkServiceNumber instanceof Error) {
                console.error('checkServiceNumber', checkServiceNumber);
                return [];
              }
              return (
                (consulData[availableServices] as Array<{ code: unknown }>).find((el) => el.code === checkServiceNumber) &&
                isNotOnLeave &&
                isWithinWorkingHours
              );
            }

            return isWithinWorkingHours && isNotOnLeave;
          });

          if (serviceNumber) {
            const checkServiceNumber = evaluate(serviceNumber, rootDocument.data);
            if (checkServiceNumber instanceof Error) {
              console.error('checkServiceNumber', checkServiceNumber);
            }
            if (!(day?.data as Record<string, unknown>)?.[availableServices] || !((day?.data as Record<string, unknown>)[availableServices] as Array<{ code: unknown }>).find((el) => el.code === checkServiceNumber)){
              start.add(slotIntervalEval, 'minutes');
              continue;
            }
          }

          const disabled =
            !(ignoreVisitPast && day?.currentDate === moment().format('YYYY-MM-DD')) &&
            (isAlreadyPassed ||
              availableConsuls.length === 0 ||
              (isConsuleCalendar ? !isNotOnLeave : false))
              ? DISABLED_STATUS
              : undefined;

          const addition: Record<string, unknown> = {};

          additionFields.forEach((field) => {
            addition[field] = ((day?.data as Record<string, unknown>) || {})[field];
          });

          const slotBody: Record<string, unknown> = {
            id,
            title: `${start.format('HH:mm')} - ${slotEnd.format('HH:mm')}`,
            ...(handleOpenDialog ? { ...day, title: day?.title } : {}),
            start: ignoreTimezone ? moment.parseZone((start as unknown as { _i: string })._i).format() : start.format(),
            end: fixedSLotInterval
              ? ignoreTimezone
                ? moment.parseZone((slotEnd as unknown as { _i: string })._i).format()
                : slotEnd.format()
              : ignoreTimezone
              ? moment.parseZone((end as unknown as { _i: string })._i).format()
              : end.format(),
            renderStart: ignoreTimezone
              ? moment.parseZone((start as unknown as { _i: string })._i).format('HH:mm')
              : start.format('HH:mm'),
            renderEnd: fixedSLotInterval
              ? ignoreTimezone
                ? moment.parseZone((slotEnd as unknown as { _i: string })._i).format('HH:mm')
                : slotEnd.format('HH:mm')
              : ignoreTimezone
              ? moment.parseZone((end as unknown as { _i: string })._i).format('HH:mm')
              : end.format('HH:mm'),
            originType: disabled,
            disabled: !!disabled,
            chosen: !!(value as Record<string, unknown>)?.chosenSlots && ((value as Record<string, unknown>)?.chosenSlots as Array<Record<string, unknown>>)?.some((slot) => slot?.id === id),
            addition,
            timeZone: dayTimeZone,
            isAlreadyPassed,
            [groupBy]: availableConsuls.map((consul) => (consul?.data as Record<string, unknown>)?.consulIpnHash)
          };

          result.push(slotBody);

          start.add(slotIntervalEval, 'minutes');
        }
      });

      return result;
    },
    [
      value,
      additionFields,
      fixedSLotInterval,
      groupBy,
      handleOpenDialog,
      slotIntervalEval,
      ignoreTimezone,
      timeSlotsSource,
      invertTime,
      ignoreSlotInterval,
      isConsuleCalendar,
      ignoreVisitPast
    ]
  );

  const generateDays = React.useCallback(
    (schedules: Array<Record<string, unknown>>, disabledSlots: unknown[]) => {
      const startDate = moment(minDateEval).startOf('day');

      const result: Array<Record<string, unknown>> = [];

      const activeSchedules = schedules
        .filter(({ data }) => {
          const scheduleData = data as Record<string, unknown>;
          if (scheduleData[scheduleEndDate]) {
            const endDate = moment(scheduleData[scheduleEndDate] as string);
            const periodDays = endDate.diff(startDate, 'days');
            const isPeriodValid = periodDays >= 0;
            return isPeriodValid;
          }

          return !scheduleData[scheduleEndDate];
        })
        .map(({ data }) => data as Record<string, unknown>);

      const flattenedNotWorkingDays = (flatten(
        activeSchedules.map((schedule) => {
          const disabledTimes = Array.isArray(schedule?.[disabledTimeSlots])
            ? (schedule[disabledTimeSlots] as unknown[])
            : [];
          return disabledTimes.map((el) => ({
            ...(el as Record<string, unknown>),
            consulIpnHash: schedule?.consulIpnHash
          }));
        })
      ) as unknown[]).concat(disabledSlots);

      setNotWorkingDays(flattenedNotWorkingDays);

      activeSchedules.forEach((schedule) => {
        const shed = (schedules.find(
          (el) => !!(el.data as Record<string, unknown>)[scheduleEndDate] && schedule.consulIpnHash === (el.data as Record<string, unknown>).consulIpnHash
        )?.data) as Record<string, unknown> | undefined;

        let scheduleStartDate =
          shed &&
          shed[scheduleEndDate] &&
          !schedule[scheduleEndDate] &&
          shed?.consulIpnHash === schedule?.consulIpnHash
            ? moment(shed[scheduleEndDate] as string).startOf('day')
            : startDate;

        let endDate = (
          shed
            ? (shed[scheduleEndDate] && !schedule[scheduleEndDate]) ||
              (!shed[scheduleEndDate] &&
                !schedule[scheduleEndDate] &&
                shed?.consulIpnHash === schedule?.consulIpnHash)
              ? moment(maxDateEval)
              : moment(shed[scheduleEndDate] as string)
            : moment(maxDateEval)
        ).startOf('day');

        if (endDate.isAfter(maxDateEval as never)) {
          endDate = moment(maxDateEval).startOf('day');
        }

        if (startDayMove) {
          scheduleStartDate = scheduleStartDate.add(startDayMove, 'days').startOf('day');
        }

        const periodDays = endDate.diff(scheduleStartDate, 'days');

        if (periodDays < 0) {
          return;
        }

        for (let i = 0; i <= periodDays; i += 1) {
          const currentDate = scheduleStartDate.clone().add(i, 'days');

          if ((holidaysEval as unknown[]).find((holiday) => moment(holiday as never).isSame(currentDate, 'day'))) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const currentDay = currentDate.format('dddd');
          const sortTimeSlotsSource = invertTime
            ? getNonWorkingHours(schedule[timeSlotsSource] as WorkingHoursEntry[])
            : (schedule[timeSlotsSource] as Array<Record<string, unknown>>);

          const currentDaySchedule = sortTimeSlotsSource.filter(({ workingDays, day }) => {
            const removeSymbols = (str: string) => str.replace(/[^a-zA-Zа-яА-Я]/g, '');
            return removeSymbols((day || workingDays) as string) === removeSymbols(currentDay);
          });

          if (currentDaySchedule.length) {
            currentDaySchedule.forEach((item) => {
              const fromSource = (item?.from || item?.workingHoursFrom) as string;
              const toSource = (item?.to || item?.workingHoursTo) as string;

              const start = moment(currentDate)
                .set('hour', Number(fromSource.split(':')[0]))
                .set('minute', Number(fromSource.split(':')[1]));

              const end = moment(currentDate)
                .set('hour', Number(toSource.split(':')[0]))
                .set('minute', Number(toSource.split(':')[1]));

              result.push({
                title: `${start.format('HH:mm')} - ${end.format('HH:mm')}`,
                // `.parseZone(x)` here is an instance method call whose argument moment.js
                // ignores at runtime (the real "reparse preserving original offset" call takes no
                // arguments) — preserved verbatim from the original source, just without the
                // inert argument since TypeScript's real moment types reject the extra arity.
                start: ignoreTimezone ? start.parseZone().format() : start.format(),
                end: ignoreTimezone ? end.parseZone().format() : end.format(),
                currentDate: ignoreTimezone
                  ? currentDate.parseZone().format('YYYY-MM-DD')
                  : currentDate.format('YYYY-MM-DD'),
                timeZone: timeZoneEval,
                data: schedule
              });
            });
          }
        }
      });

      const groupResult = result.reduce((acc: Record<string, Array<Record<string, unknown>>>, item) => {
        const key = ignoreTimezone
          ? moment.parseZone(item.start as string).format('YYYY-MM-DD')
          : moment(item.start as string).format('YYYY-MM-DD');
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {});

      setScheduleDays(groupResult);

      let timeStamp = new Date().getTime();

      const worker = new Worker(new URL('./worker', import.meta.url), {
        type: 'module',
      });

      const messageListener = (event: MessageEvent) => {
        const { data } = event;

        if (!data.error) {
          timeStamp = new Date().getTime() - timeStamp;
          setAvailableSlotsExist(data.result);
        }

        worker.removeEventListener('message', messageListener);

        worker.terminate();

        setGenerating(false);
      };

      worker.addEventListener('message', messageListener, false);

      worker.postMessage(
        JSON.parse(
          JSON.stringify({
            schedules: result,
            notWorkingDays: flattenedNotWorkingDays,
            slotIntervalEval,
            timeSlotsSource,
            ignoreTimezone,
            invertTime,
            serviceNumber,
            rootDocument,
            ignoreSlotInterval,
            availableServices,
            ignoreVisitPast,
            isConsuleCalendar
          })
        )
      );
    },
    [
      minDateEval,
      maxDateEval,
      scheduleEndDate,
      timeSlotsSource,
      disabledTimeSlots,
      startDayMove,
      holidaysEval,
      timeZoneEval,
      invertTime,
      slotIntervalEval,
      ignoreTimezone
    ]
  );

  const generateSlots = React.useCallback(
    (daySchedule: Array<Record<string, unknown>>) => {
      const result = evalDate(daySchedule, notWorkingDays as Array<Record<string, unknown>>);

      if (!daySchedule) return result;

      const grouped = result.reduce((acc: Array<Record<string, unknown>>, slot) => {
        const foundSlot = acc.find(({ id }) => slot.id === id);
        if (foundSlot) {
          if (foundSlot[groupBy] !== slot[groupBy]) {
            foundSlot[groupBy] = ([] as unknown[])
              .concat(foundSlot[groupBy] as never || [])
              .concat(slot[groupBy] as never)
              .filter((e, index, self) => self.indexOf(e) === index);
          }
        } else {
          acc.push(slot);
        }
        return acc;
      }, []);

      return grouped;
    },
    [groupBy, notWorkingDays, evalDate]
  );

  const weekCount = React.useCallback(
    (weekDays: Array<Record<string, unknown>>) => {
      let freeDaysCount = 0;

      weekDays.forEach((day) => {
        if (!day) return;
        const bookedPeriods = (((day?.data as Record<string, unknown>)?.nonWorkingTime as Array<Record<string, unknown>>) || [])
          .map((day) => ({
            start: (ignoreTimezone
              ? moment.utc(day.notWorkingDateAndHoursFrom as string)
              : moment(day.notWorkingDateAndHoursFrom as string)
            ).valueOf(),
            end: (ignoreTimezone
              ? moment.utc(day.notWorkingDateAndHoursTo as string)
              : moment(day.notWorkingDateAndHoursTo as string)
            ).valueOf()
          }))
          .sort((a, b) => a.start - b.start);

        const { start: from, end: to, timeZone } = day as { start: string; end: string; timeZone: string };
        const start0 = (
          ignoreTimezone ? moment.utc(from) : moment(from).utcOffset(timeZone, true)
        ).valueOf();
        const end = (
          ignoreTimezone ? moment.utc(to) : moment(to).utcOffset(timeZone, true)
        ).valueOf();
        const interval = slotIntervalEval * 60000;
        let start = start0;

        while (start < end) {
          const slotEnd = start + interval;

          if (slotEnd > end) break;

          let isFree = true;
          for (const period of bookedPeriods) {
            if (slotEnd <= period.start) break;
            if (!(slotEnd <= period.start || start >= period.end)) {
              isFree = false;
              break;
            }
          }

          if (isFree) {
            freeDaysCount++;
          }

          start += interval;
        }
      });

      return freeDaysCount;
    },
    [ignoreTimezone, notWorkingDays, slotIntervalEval]
  );

  const fetchData = React.useCallback(
    async (useEvalProps = false) => {
      if (fetchError) return;

      let localKeyId = keyId;
      let localService = service;
      let localMethod = method;
      let localFilters = filters;
      let localAdditionalFilter = additionalFilter;

      if (useEvalProps) {
        const evalProps = evaluate(
          additionalDisabledSlotsRequest as string,
          value,
          rootDocument.data[stepName as string],
          rootDocument.data
        ) as Record<string, unknown> | Error;

        if (evalProps && !(evalProps instanceof Error)) {
          localKeyId = evalProps.keyId as number;
          localService = evalProps.service as string;
          localMethod = evalProps.method as string;
          localFilters = evalProps.filters as Array<{ name: string; value: string }>;
          localAdditionalFilter = evalProps.additionalFilter as string;
        }
      }

      const requestRecordsFuncName = localAdditionalFilter
        ? requestRegisterKeyRecordsFilter
        : requestRegisterKeyRecords;

      let result: unknown;

      if (localService && localMethod) {
        const filter: Record<string, unknown> = {};

        (localFilters || []).forEach(({ name, value: filterValue }) => {
          const evalValue = evaluate(
            filterValue,
            value,
            rootDocument.data[stepName as string],
            rootDocument.data
          );

          if (evalValue instanceof Error) {
            filter[`${name}`] = objectPath.get(rootDocument, filterValue);
          } else {
            filter[`${name}`] = evalValue;
          }
        });

        result = await dispatch(
          requestExternalData({
            service: localService,
            method: localMethod,
            filters: filter
          })
        );
      } else {
        result = await dispatch((requestRecordsFuncName as (...args: unknown[]) => unknown)(localKeyId, getFilters()));
      }

      if (result instanceof Error) {
        setError(result.message);
        return;
      }

      if (useEvalProps) {
        return (
          (result as { reservedSlots?: Array<Record<string, unknown>> })?.reservedSlots?.map((item) => ({
            notWorkingDateAndHoursTo: item.receptionDateAndTimeTo,
            notWorkingDateAndHoursFrom: item.receptionDateAndTimeFrom,
            consulIpnHash: item.consulIpnHash
          })) || []
        );
      } else {
        return result;
      }
    },
    [
      keyId,
      dispatch,
      getFilters,
      additionalFilter,
      fetchError,
      filters,
      rootDocument,
      method,
      service,
      additionalDisabledSlotsRequest,
      value,
      stepName
    ]
  );

  const fetchDataDataPath = React.useCallback(async () => {
    await processList.hasOrSet('init_calendar' + path.join('_'), async () => {
      setGenerating(true);
      let schedulesResult = evaluate(dataPath as string, rootDocument?.data) as unknown[] | Error;

      if (schedulesResult instanceof Error) {
        schedulesResult = objectPath.get(rootDocument?.data, dataPath as string) as unknown[];
      }

      const result = (schedulesResult as Array<Record<string, unknown>>).map(({ start, end, title, ...rest }) =>
        cleenDeep({
          currentDate: ignoreTimezone
            ? moment(start as string).parseZone().format('YYYY-MM-DD')
            : moment(start as string).format('YYYY-MM-DD'),
          start: start,
          end: end,
          title,
          timeZone: timeZoneEval,
          id: `${start}-${end}`,
          ...rest
        })
      );

      const groupResult = result.reduce((acc: Record<string, unknown[]>, item) => {
        const key = ignoreTimezone
          ? moment(item.start as string).parseZone().format('YYYY-MM-DD')
          : moment(item.start as string).format('YYYY-MM-DD');
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {});

      if (Object.keys(groupResult || {}).length) {
        setAvailableSlotsExist(true);
      }

      setScheduleDays(groupResult);

      setGenerating(false);
    });
  }, [path, dataPath, rootDocument, timeZoneEval, ignoreTimezone]);

  const setStatus = React.useCallback(
    (slots: unknown[]) => {
      if (!generating && !Object.keys(scheduleDays || {}).length) {
        return 'inactive';
      }

      if (Object.keys(scheduleDays || {}).length && !(slots || []).length) {
        return 'active';
      }

      if (value && (slots || []).length) {
        return 'filled';
      }

      return 'inactive';
    },
    [generating, scheduleDays, value]
  );

  const handleChange = React.useCallback(
    (newSlots: unknown, day: unknown, save?: boolean) => {
      if (readOnly) {
        return;
      }

      if (handleOpenDialog) {
        setDialog(newSlots);
        return;
      }

      const chosenSlots = ((value as Record<string, unknown>)?.chosenSlots as Array<Record<string, unknown>>) || [];
      const chosenDays = ((value as Record<string, unknown>)?.chosenDays as unknown[]) || [];

      const newValue: Record<string, unknown> = {
        chosenSlots,
        chosenDays
      };

      const slots = (([] as unknown[])
        .concat(newSlots as never) as Array<Record<string, unknown>>)
        .map((slot) => {
          if (slot.isAlreadyPassed) {
            return null;
          }

          return {
            id: slot.id,
            from: moment(slot.start as string).utcOffset(timeZoneEval).format(UTC_FORMAT),
            to: moment(slot.end as string).utcOffset(timeZoneEval).format(UTC_FORMAT),
            addition: slot.addition,
            status: slot.originType === DISABLED_STATUS ? 'available' : 'inaccessible',
            [groupBy]: slot[groupBy]
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (save) {
        newValue.chosenSlots = chosenSlots.concat(slots);
        chosenDays.push(day);
      }

      if (save === false) {
        newValue.chosenSlots = chosenSlots.filter(
          ({ id }) => !slots.find((slot) => slot.id === id)
        );
        newValue.chosenDays = chosenDays.filter((chosenDay) => chosenDay !== day);
      }

      if (save === undefined) {
        if (chosenSlots.find(({ id }) => slots.find((slot) => slot.id === id))) {
          newValue.chosenSlots = chosenSlots.filter(
            ({ id }) => !slots.find((slot) => slot.id === id)
          );
        } else {
          newValue.chosenSlots = chosenSlots.concat(slots);
        }
        newValue.chosenDays = chosenDays.filter((chosenDay) => chosenDay !== day);
      }

      newValue.chosenSlots = (newValue.chosenSlots as Array<Record<string, unknown>>).filter(
        (slot, index, self) => index === self.findIndex((e) => e.id === slot.id)
      );

      newValue.status = setStatus(newValue.chosenSlots as unknown[]);

      onChange(newValue);
    },
    [readOnly, value, setStatus, handleOpenDialog, groupBy, onChange, timeZoneEval]
  );

  const handleClearData = React.useCallback(() => {
    onChange({});
  }, [onChange]);

  React.useEffect(() => {
    if (dataPath || Object.keys(scheduleDays || {}).length || generating) return;

    const initFetchData = async () => {
      setGenerating(true);
      const disabledSlotsResult = additionalDisabledSlotsRequest
        ? await fetchData(true)
        : disabledSlotsEval;
      const schedulesResult = await fetchData();
      generateDays(schedulesResult as Array<Record<string, unknown>>, disabledSlotsResult as unknown[]);
      setGenerating(false);
    };

    waiter.addAction(
      taskId as string,
      () => processList.hasOrSet('init_calendar' + path.join('_'), initFetchData),
      50
    );
  }, [
    fetchData,
    path,
    taskId,
    dataPath,
    scheduleDays,
    additionalDisabledSlotsRequest,
    disabledSlotsEval,
    generateDays,
    generating
  ]);

  React.useEffect(() => {
    if (keyId && !dataPath) return;

    fetchDataDataPath();
  }, [keyId, fetchDataDataPath, dataPath, rootDocument]);

  React.useEffect(() => {
    if (generating || availableSlotsExist === null) return;

    if (!availableSlotsExist && (value as Record<string, unknown>)?.status !== 'inactive') {
      onChange({
        ...value,
        status: 'inactive'
      });
    } else if (availableSlotsExist && (value as Record<string, unknown>)?.status === 'inactive') {
      onChange({
        ...value,
        status: 'active'
      });
    }
  }, [scheduleDays, userGeneratedDays, onChange, value, generating, availableSlotsExist]);

  React.useEffect(() => {
    localStorage.removeItem('activeDay');
    localStorage.removeItem('activeMonth');
    localStorage.removeItem('activeWeek');
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <ElementContainer
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      maxWidth={'100%'}
    >
      <ProgressLine loading={generating} />

      {generating || availableSlotsExist === null ? (
        <Disclaimer text={t('FetchingActiveSlots')} />
      ) : !generating && (!Object.keys(scheduleDays || {}).length || !availableSlotsExist) ? (
        <Disclaimer text={fetchError || notFoundMessageEval || t('EmptyResults')} emoji={'🤷‍♂️'} />
      ) : (
        <>
          <RenderSchedule
            description={description}
            scheduleDays={scheduleDays}
            generateSlots={generateSlots}
            weekCount={weekCount}
            toggleDisabled={toggleDisabled}
            handleChange={handleChange}
            choseAllDay={choseAllDay}
            ignoreTimezone={ignoreTimezone}
            handleClearData={handleClearData}
            chosenSlots={(((value as Record<string, unknown>)?.chosenSlots as unknown[]) || []) as Array<Record<string, unknown>>}
            chosenDays={(((value as Record<string, unknown>)?.chosenDays as unknown[]) || []) as string[]}
            handleOpenDialog={handleOpenDialogEval}
            shiftChose={shiftChose}
            chosenStatusExtendEval={chosenStatusExtendEval}
            // `userGeneratedDays` state above is declared/initialized as an array
            // (`useState<unknown[]>([])`) but its value is never read anywhere —
            // it exists purely to retrigger the effect below when it changes — so
            // `renderSchedule.tsx`'s object-shaped updater is harmless at runtime;
            // cast bridges the array-vs-object declared shapes at this boundary.
            setUserGeneratedDays={setUserGeneratedDays as unknown as (updater: (prev: Record<string, number>) => Record<string, number>) => void}
            readOnly={readOnly}
            slotsText={slotsText as string | undefined}
          />

          <Dialog
            open={!!dialog}
            onClose={() => setDialog(false)}
            fullWidth={true}
            maxWidth={'sm'}
            scroll={'body'}
            classes={{ paper: classes.paperWidth }}
          >
            <DialogTitle className={classes.dialogTitle}>
              <IconButton
                data-testid="close-dialog"
                onClick={() => setDialog(false)}
                aria-label={t('Close')}
              >
                <IconClose />
              </IconButton>
            </DialogTitle>
            <DialogContent className={classes.dialogContent}>
              {renderHTML(handleOpenDialogEval as string)}
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
              {(dialogActionsEval || []).map(({ name, url, variant }) => (
                <Button
                  key={name}
                  color="primary"
                  variant={(variant || 'outlined') as never}
                  aria-label={name}
                  href={url}
                  className={classes.button}
                >
                  {name}
                </Button>
              ))}
            </DialogActions>
          </Dialog>
        </>
      )}
    </ElementContainer>
  );
};

ScheduleCalendar.defaultProps = {
  description: '',
  sample: '',
  required: false,
  error: '',
  keyId: null,
  value: {},
  path: [],
  filters: [],
  minDate: '(moment) => moment()',
  maxDate: '(moment) => moment().add(7, "days")',
  slotInterval: '() => 15',
  timeSlotsSource: 'receptionCitizensTime',
  disabledTimeSlots: 'nonWorkingTime',
  groupBy: 'consulIpn',
  additionalFilter: null,
  availableServices: 'consularInstitutionService',
  scheduleEndDate: 'admissionSchedulePeriodDate',
  additionalDisabledSlots: '() => []',
  additionFields: [],
  originDocument: {},
  rootDocument: {},
  dataPath: null,
  readOnly: false,
  toggleDisabled: false,
  notFoundMessage: null,
  handleOpenDialog: null,
  dialogActions: null,
  choseAllDay: false,
  taskId: null,
  startDayMove: 0,
  holidays: null,
  stepName: null,
  hidden: false,
  timeZone: null,
  shiftChose: false,
  chosenStatusExtend: null,
  fixedSLotInterval: true,
  search: null,
  indexedSort: {},
  invertTime: false,
  service: '',
  method: '',
  ignoreTimezone: false,
  ignoreSlotInterval: false,
  serviceNumber: null
};

export default ScheduleCalendar;
