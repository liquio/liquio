import React from 'react';
import PropTypes from 'prop-types';
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
import {
  requestRegisterKeyRecords,
  requestRegisterKeyRecordsFilter
} from 'application/actions/registry';
import processList from 'services/processList';
import evaluate from 'helpers/evaluate';
import Disclaimer from 'components/Disclaimer';
import ProgressLine from 'components/Preloader/ProgressLine';
import waiter from 'helpers/waitForAction';
import flatten from 'helpers/flatten';
import renderHTML from 'helpers/renderHTML';
import { makeStyles } from '@mui/styles';
import { requestExternalData } from 'application/actions/externalReader';
import { ReactComponent as IconClose } from './assets/ic_close_big.svg';
import RenderSchedule from './renderSchedule';

const DISABLED_STATUS = 'disabled';
const UTC_FORMAT = 'YYYY-MM-DD[T]HH:mm:ss.SSZ';
const useStyles = makeStyles((theme) => ({
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
      flexWrap: 'wrap'
    }
  },
  paperWidth: {
    maxWidth: 736
  }
}));

const getNonWorkingHours = (workingHours) => {
  const allDays = ['понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота', 'неділя'];
  const nonWorkingHours = [];

  function compareTime(a, b) {
    return a.localeCompare(b);
  }

  const groupedByDay = workingHours.reduce((acc, entry) => {
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

const ScheduleCalendar = ({
  description,
  sample,
  required,
  error,
  keyId,
  onChange,
  value,
  filters,
  rootDocument,
  path,
  minDate,
  maxDate,
  stepName,
  slotInterval,
  timeSlotsSource,
  disabledTimeSlots,
  groupBy,
  additionalFilter,
  originDocument: { id: originDocumentId },
  rootDocument: { id: rootDocumentId },
  scheduleEndDate,
  additionalDisabledSlots,
  readOnly,
  additionFields,
  dataPath,
  toggleDisabled,
  notFoundMessage,
  handleOpenDialog,
  hidden,
  dialogActions,
  choseAllDay,
  taskId,
  startDayMove,
  holidays,
  timeZone,
  shiftChose,
  chosenStatusExtend,
  fixedSLotInterval,
  search,
  indexedSort,
  invertTime,
  service,
  method,
  ignoreTimezone,
  slotsText,
  ignoreSlotInterval,
  isConsuleCalendar,
  ignoreVisitPast,
  additionalDisabledSlotsRequest,
  serviceNumber,
  availableServices
}) => {
  const t = useTranslate('ScheduleCalendar');
  const [generating, setGenerating] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const [scheduleDays, setScheduleDays] = React.useState({});
  const [notWorkingDays, setNotWorkingDays] = React.useState([]);
  const [fetchError, setError] = React.useState(null);
  const [userGeneratedDays, setUserGeneratedDays] = React.useState([]);
  const [availableSlotsExist, setAvailableSlotsExist] = React.useState(null);
  const dispatch = useDispatch();
  const classes = useStyles();

  const minDateEval = React.useMemo(() => {
    if (!minDate) return moment();

    return evaluate(minDate, moment, value, rootDocument.data[stepName], rootDocument.data);
  }, [minDate, value, rootDocument, stepName]);

  const maxDateEval = React.useMemo(() => {
    if (!maxDate) return moment().add(7, 'days');

    return evaluate(maxDate, moment, value, rootDocument.data[stepName], rootDocument.data);
  }, [maxDate, value, rootDocument, stepName]);

  const holidaysEval = React.useMemo(() => {
    if (!holidays) return [];

    return evaluate(holidays, moment, value, rootDocument.data[stepName], rootDocument.data);
  }, [holidays, value, rootDocument, stepName]);

  const slotIntervalEval = React.useMemo(() => {
    if (!slotInterval) return 15;

    return evaluate(slotInterval, moment, value, rootDocument.data[stepName], rootDocument.data);
  }, [slotInterval, value, rootDocument, stepName]);

  const disabledSlotsEval = React.useMemo(() => {
    if (!additionalDisabledSlots) return [];

    return evaluate(
      additionalDisabledSlots,
      moment,
      value,
      rootDocument.data[stepName],
      rootDocument.data
    );
  }, [additionalDisabledSlots, value, rootDocument, stepName]);

  const notFoundMessageEval = React.useMemo(() => {
    if (!notFoundMessage) return null;

    const messageEvaluated = evaluate(
      notFoundMessage,
      moment,
      value,
      rootDocument.data[stepName],
      rootDocument.data
    );

    if (messageEvaluated instanceof Error) {
      return notFoundMessage;
    }

    return messageEvaluated;
  }, [notFoundMessage, value, rootDocument, stepName]);

  const handleOpenDialogEval = React.useMemo(() => {
    if (!handleOpenDialog) return null;

    return evaluate(handleOpenDialog, moment, dialog);
  }, [handleOpenDialog, dialog]);

  const dialogActionsEval = React.useMemo(() => {
    if (!dialogActions) return [];

    return evaluate(dialogActions, moment, dialog, rootDocument.data);
  }, [dialogActions, dialog, rootDocument]);

  const timeZoneEval = React.useMemo(() => {
    if (!timeZone) {
      const userOffsetInMinutes = new Date().getTimezoneOffset();
      const userOffsetInHours = -userOffsetInMinutes / 60;
      return `GMT${userOffsetInHours > 0 ? '+' : ''}${userOffsetInHours}:00`;
    }

    return evaluate(timeZone, moment, value, rootDocument.data[stepName], rootDocument.data);
  }, [timeZone, value, rootDocument, stepName]);

  const chosenStatusExtendEval = React.useCallback(
    (slot) => {
      if (!chosenStatusExtend) return null;

      return evaluate(chosenStatusExtend, slot);
    },
    [chosenStatusExtend]
  );

  const getSearchQS = React.useCallback(() => {
    let addition = {};

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
    const filter = {};

    (filters || []).forEach(({ name, value: filterValue }) => {
      filter[`data_like[${name}]`] = objectPath.get(rootDocument, filterValue);
    });

    const control = []
      .concat('documents', rootDocumentId || originDocumentId, stepName, path)
      .join('.');

    filter.control = control;
    filter.limit = 100;

    return {
      ...filter,
      ...getSearchQS()
    };
  }, [filters, rootDocument, path, rootDocumentId, originDocumentId, stepName, getSearchQS]);

  const evalDate = React.useCallback(
    (daySchedule, notWorkingDaysProp) => {
      const result = [];

      if (!daySchedule) return result;

      daySchedule.forEach((day) => {
        const { start: from, end: to, timeZone: dayTimeZone } = day;
        const currentMoment = moment(day.currentDate, 'YYYY-MM-DD');
        const filterNotWorkingDays = notWorkingDaysProp.filter((period) => {
          const fromMoment = moment(period.notWorkingDateAndHoursFrom)
            .utcOffset(dayTimeZone, false)
            .format('YYYY-MM-DD');
          const toMoment = moment(period.notWorkingDateAndHoursTo)
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

          const availableConsuls = daySchedule.filter((consul) => {
            if (!consul?.data) return true;
            const consulIpnHash = consul?.data?.consulIpnHash;
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
              (daySchedule) => daySchedule.consulIpnHash === consulIpnHash
            );

            isNotOnLeave = !nonWorkingPeriodsByConsul.some((period) => {
              return (
                slotEnd.isAfter(period.notWorkingDateAndHoursFrom) &&
                start.isBefore(period.notWorkingDateAndHoursTo)
              );
            });

            if (serviceNumber) {
              const checkServiceNumber = evaluate(serviceNumber, rootDocument.data);
              if (checkServiceNumber instanceof Error) {
                console.error('checkServiceNumber', checkServiceNumber);
                return [];
              }
              return (
                consul?.data[availableServices].find((el) => el.code === checkServiceNumber) &&
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
            if (!day?.data[availableServices].find((el) => el.code === checkServiceNumber)){
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

          const addition = {};

          additionFields.forEach((field) => {
            addition[field] = (day?.data || {})[field];
          });

          const slotBody = {
            id,
            title: `${start.format('HH:mm')} - ${slotEnd.format('HH:mm')}`,
            ...(handleOpenDialog ? { ...day, title: day?.title } : {}),
            start: ignoreTimezone ? moment.parseZone(start._i).format() : start.format(),
            end: fixedSLotInterval
              ? ignoreTimezone
                ? moment.parseZone(slotEnd._i).format()
                : slotEnd.format()
              : ignoreTimezone
              ? moment.parseZone(end._i).format()
              : end.format(),
            renderStart: ignoreTimezone
              ? moment.parseZone(start._i).format('HH:mm')
              : start.format('HH:mm'),
            renderEnd: fixedSLotInterval
              ? ignoreTimezone
                ? moment.parseZone(slotEnd._i).format('HH:mm')
                : slotEnd.format('HH:mm')
              : ignoreTimezone
              ? moment.parseZone(end._i).format('HH:mm')
              : end.format('HH:mm'),
            originType: disabled,
            disabled: !!disabled,
            chosen: !!value?.chosenSlots && value?.chosenSlots?.some((slot) => slot?.id === id),
            addition,
            timeZone: dayTimeZone,
            isAlreadyPassed,
            [groupBy]: availableConsuls.map((consul) => consul?.data?.consulIpnHash)
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
    (schedules, disabledSlots) => {
      const startDate = moment(minDateEval).startOf('day');

      const result = [];

      const activeSchedules = schedules
        .filter(({ data }) => {
          if (data[scheduleEndDate]) {
            const endDate = moment(data[scheduleEndDate]);
            const periodDays = endDate.diff(startDate, 'days');
            const isPeriodValid = periodDays >= 0;
            return isPeriodValid;
          }

          return !data[scheduleEndDate];
        })
        .map(({ data }) => data);

      const flattenedNotWorkingDays = flatten(
        activeSchedules.map((schedule) => {
          const disabledTimes = Array.isArray(schedule?.[disabledTimeSlots])
            ? schedule[disabledTimeSlots]
            : [];
          return disabledTimes.map((el) => ({
            ...el,
            consulIpnHash: schedule?.consulIpnHash
          }));
        })
      ).concat(disabledSlots);

      setNotWorkingDays(flattenedNotWorkingDays);

      activeSchedules.forEach((schedule) => {
        const shed = schedules.find(
          (el) => !!el.data[scheduleEndDate] && schedule.consulIpnHash === el.data.consulIpnHash
        )?.data;

        let scheduleStartDate =
          shed &&
          shed[scheduleEndDate] &&
          !schedule[scheduleEndDate] &&
          shed?.consulIpnHash === schedule?.consulIpnHash
            ? moment(shed[scheduleEndDate]).startOf('day')
            : startDate;

        let endDate = (
          shed
            ? (shed[scheduleEndDate] && !schedule[scheduleEndDate]) ||
              (!shed[scheduleEndDate] &&
                !schedule[scheduleEndDate] &&
                shed?.consulIpnHash === schedule?.consulIpnHash)
              ? moment(maxDateEval)
              : moment(shed[scheduleEndDate])
            : moment(maxDateEval)
        ).startOf('day');

        if (endDate.isAfter(maxDateEval)) {
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

          if (holidaysEval.find((holiday) => moment(holiday).isSame(currentDate, 'day'))) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const currentDay = currentDate.format('dddd');
          const sortTimeSlotsSource = invertTime
            ? getNonWorkingHours(schedule[timeSlotsSource])
            : schedule[timeSlotsSource];

          const currentDaySchedule = sortTimeSlotsSource.filter(({ workingDays, day }) => {
            const removeSymbols = (str) => str.replace(/[^a-zA-Zа-яА-Я]/g, '');
            return removeSymbols(day || workingDays) === removeSymbols(currentDay);
          });

          if (currentDaySchedule.length) {
            currentDaySchedule.forEach((item) => {
              const fromSource = item?.from || item?.workingHoursFrom;
              const toSource = item?.to || item?.workingHoursTo;

              const start = moment(currentDate)
                .set('hour', fromSource.split(':')[0])
                .set('minute', fromSource.split(':')[1]);

              const end = moment(currentDate)
                .set('hour', toSource.split(':')[0])
                .set('minute', toSource.split(':')[1]);

              result.push({
                title: `${start.format('HH:mm')} - ${end.format('HH:mm')}`,
                start: ignoreTimezone ? start.parseZone(start).format() : start.format(),
                end: ignoreTimezone ? end.parseZone(end).format() : end.format(),
                currentDate: ignoreTimezone
                  ? currentDate.parseZone(currentDate).format('YYYY-MM-DD')
                  : currentDate.format('YYYY-MM-DD'),
                timeZone: timeZoneEval,
                data: schedule
              });
            });
          }
        }
      });

      const groupResult = result.reduce((acc, item) => {
        const key = ignoreTimezone
          ? moment.parseZone(item.start).format('YYYY-MM-DD')
          : moment(item.start).format('YYYY-MM-DD');
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {});

      setScheduleDays(groupResult);

      let timeStamp = new Date().getTime();

      const worker = new Worker(new URL('./worker.js', import.meta.url));

      const messageListener = (event) => {
        const { data } = event;

        if (!data.error) {
          timeStamp = new Date().getTime() - timeStamp;
          setAvailableSlotsExist(data.result);
        }

        worker.removeEventListener('message', messageListener, true);

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
    (daySchedule) => {
      const result = evalDate(daySchedule, notWorkingDays);

      if (!daySchedule) return result;

      const grouped = result.reduce((acc, slot) => {
        const foundSlot = acc.find(({ id }) => slot.id === id);
        if (foundSlot) {
          if (foundSlot[groupBy] !== slot[groupBy]) {
            foundSlot[groupBy] = (foundSlot[groupBy] || [])
              .concat(slot[groupBy])
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
    (weekDays) => {
      let freeDaysCount = 0;

      weekDays.forEach((day) => {
        if (!day) return;
        const bookedPeriods = (day?.data?.nonWorkingTime || [])
          .map((day) => ({
            start: (ignoreTimezone
              ? moment.utc(day.notWorkingDateAndHoursFrom)
              : moment(day.notWorkingDateAndHoursFrom)
            ).valueOf(),
            end: (ignoreTimezone
              ? moment.utc(day.notWorkingDateAndHoursTo)
              : moment(day.notWorkingDateAndHoursTo)
            ).valueOf()
          }))
          .sort((a, b) => a.start - b.start);

        const { start: from, end: to, timeZone } = day;
        let start = (
          ignoreTimezone ? moment.utc(from) : moment(from).utcOffset(timeZone, true)
        ).valueOf();
        const end = (
          ignoreTimezone ? moment.utc(to) : moment(to).utcOffset(timeZone, true)
        ).valueOf();
        const interval = slotIntervalEval * 60000;

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
          additionalDisabledSlotsRequest,
          value,
          rootDocument.data[stepName],
          rootDocument.data
        );

        if (evalProps) {
          localKeyId = evalProps.keyId;
          localService = evalProps.service;
          localMethod = evalProps.method;
          localFilters = evalProps.filters;
          localAdditionalFilter = evalProps.additionalFilter;
        }
      }

      const requestRecordsFuncName = localAdditionalFilter
        ? requestRegisterKeyRecordsFilter
        : requestRegisterKeyRecords;

      let result;

      if (localService && localMethod) {
        const filter = {};

        (localFilters || []).forEach(({ name, value: filterValue }) => {
          const evalValue = evaluate(
            filterValue,
            value,
            rootDocument.data[stepName],
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
        result = await dispatch(requestRecordsFuncName(localKeyId, getFilters()));
      }

      if (result instanceof Error) {
        setError(result.message);
        return;
      }

      if (useEvalProps) {
        return (
          result?.reservedSlots?.map((item) => ({
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
      let schedulesResult = evaluate(dataPath, rootDocument?.data);

      if (schedulesResult instanceof Error) {
        schedulesResult = objectPath.get(rootDocument?.data, dataPath);
      }

      const result = schedulesResult.map(({ start, end, title, ...rest }) =>
        cleenDeep({
          currentDate: ignoreTimezone
            ? moment(start).parseZone(start).format('YYYY-MM-DD')
            : moment(start).format('YYYY-MM-DD'),
          start: start,
          end: end,
          title,
          timeZone: timeZoneEval,
          id: `${start}-${end}`,
          ...rest
        })
      );

      const groupResult = result.reduce((acc, item) => {
        const key = ignoreTimezone
          ? moment(item.start).parseZone(item.start).format('YYYY-MM-DD')
          : moment(item.start).format('YYYY-MM-DD');
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
    (slots) => {
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
    (newSlots, day, save) => {
      if (readOnly) {
        return;
      }

      if (handleOpenDialog) {
        setDialog(newSlots);
        return;
      }

      const chosenSlots = value?.chosenSlots || [];
      const chosenDays = value?.chosenDays || [];

      const newValue = {
        chosenSlots,
        chosenDays
      };

      const slots = []
        .concat(newSlots)
        .map((slot) => {
          if (slot.isAlreadyPassed) {
            return null;
          }

          return {
            id: slot.id,
            from: moment(slot.start).utcOffset(timeZoneEval).format(UTC_FORMAT),
            to: moment(slot.end).utcOffset(timeZoneEval).format(UTC_FORMAT),
            addition: slot.addition,
            status: slot.originType === DISABLED_STATUS ? 'available' : 'inaccessible',
            [groupBy]: slot[groupBy]
          };
        })
        .filter(Boolean);

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

      newValue.chosenSlots = newValue.chosenSlots.filter(
        (slot, index, self) => index === self.findIndex((e) => e.id === slot.id)
      );

      newValue.status = setStatus(newValue.chosenSlots);

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
      generateDays(schedulesResult, disabledSlotsResult);
      setGenerating(false);
    };

    waiter.addAction(
      taskId,
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

    if (!availableSlotsExist && value?.status !== 'inactive') {
      onChange({
        ...value,
        status: 'inactive'
      });
    } else if (availableSlotsExist && value?.status === 'inactive') {
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
            chosenSlots={value?.chosenSlots || []}
            chosenDays={value?.chosenDays || []}
            handleOpenDialog={handleOpenDialogEval}
            shiftChose={shiftChose}
            chosenStatusExtendEval={chosenStatusExtendEval}
            setUserGeneratedDays={setUserGeneratedDays}
            readOnly={readOnly}
            slotsText={slotsText}
          />

          <Dialog
            open={dialog}
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
              {renderHTML(handleOpenDialogEval)}
            </DialogContent>
            <DialogActions className={classes.dialogActions}>
              {(dialogActionsEval || []).map(({ name, url, variant }) => (
                <Button
                  key={name}
                  color="primary"
                  variant={variant || 'outlined'}
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

ScheduleCalendar.propTypes = {
  description: PropTypes.string,
  sample: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.object,
  rootDocument: PropTypes.object,
  path: PropTypes.array,
  filters: PropTypes.array,
  keyId: PropTypes.number,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
  slotInterval: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  timeSlotsSource: PropTypes.string,
  disabledTimeSlots: PropTypes.string,
  groupBy: PropTypes.string,
  additionalFilter: PropTypes.string,
  scheduleEndDate: PropTypes.string,
  additionalDisabledSlots: PropTypes.string,
  additionFields: PropTypes.array,
  originDocument: PropTypes.object,
  dataPath: PropTypes.string,
  readOnly: PropTypes.bool,
  toggleDisabled: PropTypes.bool,
  notFoundMessage: PropTypes.string,
  handleOpenDialog: PropTypes.string,
  dialogActions: PropTypes.string,
  choseAllDay: PropTypes.bool,
  taskId: PropTypes.string,
  startDayMove: PropTypes.number,
  holidays: PropTypes.string,
  stepName: PropTypes.string,
  hidden: PropTypes.bool,
  timeZone: PropTypes.string,
  shiftChose: PropTypes.bool,
  chosenStatusExtend: PropTypes.string,
  fixedSLotInterval: PropTypes.bool,
  search: PropTypes.string,
  indexedSort: PropTypes.object,
  invertTime: PropTypes.bool,
  service: PropTypes.string,
  method: PropTypes.string,
  ignoreTimezone: PropTypes.bool,
  ignoreSlotInterval: PropTypes.bool,
  serviceNumber: PropTypes.string
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
