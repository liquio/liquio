/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
/* eslint-disable no-restricted-globals */
import moment from 'moment-timezone';
import evaluate from 'helpers/evaluate';

const hasService = (arr, code) => {
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
}) => {
  let isFreeFound = false;

  if (!schedules.length) return self.postMessage({ result: false });

  const evaluatedServiceNumber = serviceNumber
    ? evaluate(serviceNumber, rootDocument.data)
    : null;
  if (evaluatedServiceNumber instanceof Error) {
    console.error('checkServiceNumber', evaluatedServiceNumber);
    return self.postMessage({ result: false });
  }

  const todayStr = moment().format('YYYY-MM-DD');

  const days = schedules.filter((s) => s.currentDate);
  const consuls = schedules.filter((s) => s?.data?.consulIpnHash);

  outer: for (const day of days) {
    const { start: from, end: to, timeZone: dayTimeZone } = day;
    const currentDate = day.currentDate;

    const currentMoment = moment(currentDate, 'YYYY-MM-DD');
    const dayStart = ignoreTimezone
      ? moment(from.split('+')[0])
      : moment(from).utcOffset(dayTimeZone, true);
    const dayEnd = ignoreTimezone
      ? moment(to.split('+')[0])
      : moment(to).utcOffset(dayTimeZone, true);

    const dayNotWorking = notWorkingDays.filter((p) => {
      const fromD = moment(p.notWorkingDateAndHoursFrom)
        .utcOffset(dayTimeZone, false)
        .format('YYYY-MM-DD');
      const toD = moment(p.notWorkingDateAndHoursTo)
        .utcOffset(dayTimeZone, false)
        .format('YYYY-MM-DD');
      return currentMoment.isSame(fromD, 'day') || currentMoment.isSame(toD, 'day');
    });

    const nwdByHash = new Map();
    for (const p of dayNotWorking) {
      const hash = p.consulIpnHash || '__all__';
      if (!nwdByHash.has(hash)) nwdByHash.set(hash, []);
      nwdByHash.get(hash).push(p);
    }

    if (
      evaluatedServiceNumber &&
      !hasService(day?.data?.[availableServices], evaluatedServiceNumber)
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
      const isAlreadyPassed = moment().utcOffset(dayTimeZone).isAfter(slotStart);
      if (!ignoreVisitPast && isToday && isAlreadyPassed) continue;

      for (const consul of consuls) {
        const data = consul.data || {};
        const consulHash = data.consulIpnHash;

        let workStart = ignoreTimezone
          ? moment(consul.start.split('+')[0])
          : moment(consul.start).utcOffset(dayTimeZone, true);
        let workEnd = ignoreTimezone
          ? moment(consul.end.split('+')[0])
          : moment(consul.end).utcOffset(dayTimeZone, true);

        const isWithin =
          invertTime || (workStart.isSameOrBefore(slotStart) && workEnd.isSameOrAfter(slotEnd));
        if (!isWithin) continue;

        const leavePeriods = nwdByHash.get(consulHash) || [];
        let onLeave = false;
        for (let p of leavePeriods) {
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
          !hasService(data?.[availableServices], evaluatedServiceNumber)
        ) {
          continue;
        }

        if (isConsuleCalendar && onLeave) continue;

        isFreeFound = true;
        break outer;
      }
    }
  }

  self.postMessage({ result: isFreeFound });
};

self.addEventListener('message', onMessage, false);
