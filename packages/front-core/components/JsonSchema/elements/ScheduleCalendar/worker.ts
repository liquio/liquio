/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
/* eslint-disable no-restricted-globals */
import moment from 'moment-timezone';
import evaluate from 'helpers/evaluate';

// This file runs inside a Web Worker context, where `self` is a
// `WorkerGlobalScope` (single-argument `postMessage`) rather than `Window`
// (multi-argument `postMessage`) — the project's shared tsconfig only
// includes the DOM lib, so `self` resolves to `Window` by default. Cast to a
// minimal worker-shaped interface instead of touching the shared lib config.
const worker = self as unknown as {
  postMessage: (message: { result: boolean }) => void;
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void, useCapture?: boolean) => void;
};

interface ScheduleEntry {
  currentDate?: string;
  start: string;
  end: string;
  timeZone?: string;
  data?: Record<string, unknown> & { consulIpnHash?: string };
}

interface NotWorkingPeriod {
  notWorkingDateAndHoursFrom: string;
  notWorkingDateAndHoursTo: string;
  consulIpnHash?: string;
}

const hasService = (arr: unknown, code: unknown) => {
  if (!Array.isArray(arr)) return false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]?.code === code) return true;
  }
  return false;
};

const onMessage = ({
  data: {
    slotIntervalEval,
    schedules = [],
    notWorkingDays = [],
    ignoreTimezone,
    invertTime,
    serviceNumber,
    rootDocument,
    ignoreSlotInterval,
    availableServices,
    ignoreVisitPast,
    isConsuleCalendar,
  },
}: MessageEvent<{
  slotIntervalEval: number;
  schedules?: ScheduleEntry[];
  notWorkingDays?: NotWorkingPeriod[];
  ignoreTimezone?: boolean;
  invertTime?: boolean;
  serviceNumber?: string;
  rootDocument: { data: Record<string, unknown> };
  ignoreSlotInterval?: boolean;
  availableServices: string;
  ignoreVisitPast?: boolean;
  isConsuleCalendar?: boolean;
}>) => {
  let isFreeFound = false;

  if (!schedules.length) return worker.postMessage({ result: false });

  const evaluatedServiceNumber = serviceNumber
    ? evaluate(serviceNumber, rootDocument.data)
    : null;
  if (evaluatedServiceNumber instanceof Error) {
    console.error('checkServiceNumber', evaluatedServiceNumber);
    return worker.postMessage({ result: false });
  }

  const todayStr = moment().format('YYYY-MM-DD');

  const days = schedules.filter((s) => s.currentDate);
  const consuls = schedules.filter((s) => s?.data?.consulIpnHash);

  outer: for (const day of days) {
    const { start: from, end: to, timeZone: dayTimeZone } = day;
    const currentDate = day.currentDate as string;

    const currentMoment = moment(currentDate, 'YYYY-MM-DD');
    const dayStart = ignoreTimezone
      ? moment(from.split('+')[0])
      : moment(from).utcOffset(dayTimeZone as string, true);
    const dayEnd = ignoreTimezone
      ? moment(to.split('+')[0])
      : moment(to).utcOffset(dayTimeZone as string, true);

    const dayNotWorking = notWorkingDays.filter((p) => {
      const fromD = moment(p.notWorkingDateAndHoursFrom)
        .utcOffset(dayTimeZone as string, false)
        .format('YYYY-MM-DD');
      const toD = moment(p.notWorkingDateAndHoursTo)
        .utcOffset(dayTimeZone as string, false)
        .format('YYYY-MM-DD');
      return currentMoment.isSame(fromD, 'day') || currentMoment.isSame(toD, 'day');
    });

    const nwdByHash = new Map<string, NotWorkingPeriod[]>();
    for (const p of dayNotWorking) {
      const hash = p.consulIpnHash || '__all__';
      if (!nwdByHash.has(hash)) nwdByHash.set(hash, []);
      nwdByHash.get(hash)?.push(p);
    }

    if (
      evaluatedServiceNumber &&
      !hasService((day?.data?.[availableServices] as unknown[]), evaluatedServiceNumber)
    ) {
      continue;
    }

    for (
      let slotStart = moment(dayStart);
      slotStart.isBefore(dayEnd) && !isFreeFound;
      slotStart.add(slotIntervalEval, 'minutes')
    ) {
      const slotEnd = slotStart.clone().add(slotIntervalEval, 'minutes');

      if (!ignoreSlotInterval && slotEnd.isAfter(dayEnd)) break;

      const isToday = currentDate === todayStr;
      const isAlreadyPassed = moment().utcOffset(dayTimeZone as string).isAfter(slotStart);
      if (!ignoreVisitPast && isToday && isAlreadyPassed) continue;

      for (const consul of consuls) {
        const data = consul.data || {};
        const consulHash = data.consulIpnHash;

        const workStart = ignoreTimezone
          ? moment((consul.start as string).split('+')[0])
          : moment(consul.start).utcOffset(dayTimeZone as string, true);
        const workEnd = ignoreTimezone
          ? moment((consul.end as string).split('+')[0])
          : moment(consul.end).utcOffset(dayTimeZone as string, true);

        const isWithin =
          invertTime || (workStart.isSameOrBefore(slotStart) && workEnd.isSameOrAfter(slotEnd));
        if (!isWithin) continue;

        const leavePeriods = nwdByHash.get(consulHash as string) || [];
        let onLeave = false;
        for (const p of leavePeriods) {
          if (
            slotEnd.isAfter(p.notWorkingDateAndHoursFrom) &&
            slotStart.isBefore(p.notWorkingDateAndHoursTo)
          ) {
            onLeave = true;
            break;
          }
        }
        if (onLeave) continue;

        if (
          evaluatedServiceNumber &&
          !hasService(data?.[availableServices] as unknown[], evaluatedServiceNumber)
        ) {
          continue;
        }

        if (isConsuleCalendar && onLeave) continue;

        isFreeFound = true;
        break outer;
      }
    }
  }

  worker.postMessage({ result: isFreeFound });
};

worker.addEventListener('message', onMessage as unknown as (event: MessageEvent) => void, false);
