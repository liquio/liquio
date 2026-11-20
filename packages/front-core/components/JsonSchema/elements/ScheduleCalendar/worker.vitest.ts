import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import moment from 'moment-timezone';

type Handler = (event: { data: Record<string, unknown> }) => void;

let handler: Handler;

beforeAll(async () => {
  const addSpy = vi.spyOn(window, 'addEventListener');
  await import('./worker');
  const call = addSpy.mock.calls.find(([type]) => type === 'message');
  handler = call?.[1] as unknown as Handler;
});

const HASH = 'consul-1';

const run = (data: Record<string, unknown>): boolean => {
  const post = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
  post.mockClear();
  handler({ data: { slotIntervalEval: 30, availableServices: 'services', rootDocument: { data: {} }, ...data } });
  return (post.mock.calls[post.mock.calls.length - 1][0] as unknown as { result: boolean }).result;
};

// The worker parses schedule strings in the process zone and re-applies the
// day offset keeping local time, so build them as local wall-clock times.
const wall = (date: string, time: string) => moment(`${date}T${time}`).format();

const build = (date: string, tz: string, from: string, to: string) => {
  const day = { currentDate: date, start: wall(date, from), end: wall(date, to), timeZone: tz };
  const consul = { start: day.start, end: day.end, timeZone: tz, data: { consulIpnHash: HASH } };
  return { schedules: [day, consul] };
};

describe('ScheduleCalendar worker (moment-timezone)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes moment.tz on the default export', () => {
    expect(typeof moment.tz).toBe('function');
    expect(moment.tz('2026-06-10 12:00', 'Europe/Kyiv').utcOffset()).toBe(180);
    expect(moment.tz.zone('Europe/Kyiv')).toBeTruthy();
  });

  it('returns false without schedules', () => {
    expect(run({ schedules: [] })).toBe(false);
  });

  it('finds a free slot on a future day', () => {
    vi.setSystemTime(new Date('2026-06-09T10:00:00Z'));
    expect(run(build('2026-06-10', '+03:00', '09:00:00', '10:00:00'))).toBe(true);
  });

  it('filters already passed slots today (+03:00)', () => {
    vi.setSystemTime(new Date('2026-06-10T06:40:00Z'));
    expect(run(build('2026-06-10', '+03:00', '09:00:00', '10:00:00'))).toBe(false);
    expect(run({ ...build('2026-06-10', '+03:00', '09:00:00', '10:00:00'), slotIntervalEval: 15 })).toBe(true);
  });

  it('keeps a not yet passed slot today (+03:00)', () => {
    vi.setSystemTime(new Date('2026-06-10T06:10:00Z'));
    expect(run(build('2026-06-10', '+03:00', '09:00:00', '10:00:00'))).toBe(true);
  });

  it('honours ignoreVisitPast', () => {
    vi.setSystemTime(new Date('2026-06-10T10:00:00Z'));
    const data = build('2026-06-10', '+03:00', '09:00:00', '10:00:00');
    expect(run(data)).toBe(false);
    expect(run({ ...data, ignoreVisitPast: true })).toBe(true);
  });

  it('filters passed slots with a negative offset (-05:00)', () => {
    const data = build('2026-06-10', '-05:00', '09:00:00', '10:00:00');
    vi.setSystemTime(new Date('2026-06-10T14:50:00Z'));
    expect(run(data)).toBe(false);
    expect(run({ ...data, slotIntervalEval: 15 })).toBe(false);
    vi.setSystemTime(new Date('2026-06-10T14:40:00Z'));
    expect(run({ ...data, slotIntervalEval: 15 })).toBe(true);
  });

  it('works with +02:00 offset', () => {
    vi.setSystemTime(new Date('2026-06-10T07:10:00Z'));
    expect(run(build('2026-06-10', '+02:00', '09:00:00', '10:00:00'))).toBe(true);
    vi.setSystemTime(new Date('2026-06-10T07:40:00Z'));
    expect(run(build('2026-06-10', '+02:00', '09:00:00', '10:00:00'))).toBe(false);
  });

  it('works with ignoreTimezone on a future day', () => {
    vi.setSystemTime(new Date('2026-06-09T10:00:00Z'));
    expect(run({ ...build('2026-06-10', '+03:00', '09:00:00', '10:00:00'), ignoreTimezone: true })).toBe(true);
  });

  it('ignoreTimezone strips the offset and uses local wall time', () => {
    vi.setSystemTime(new Date('2026-06-09T10:00:00Z'));
    const data = build('2026-06-10', '+03:00', '09:00:00', '10:00:00');
    // consul works 09:00-09:30 wall time, day slots are 09:00-10:00
    data.schedules[1].end = wall('2026-06-10', '09:30:00');
    expect(run({ ...data, ignoreTimezone: true, slotIntervalEval: 30 })).toBe(true);
    expect(run({ ...data, ignoreTimezone: true, slotIntervalEval: 60 })).toBe(false);
  });

  it('assigns not working periods to the day by the day offset', () => {
    vi.setSystemTime(new Date('2026-06-01T10:00:00Z'));
    const period = {
      notWorkingDateAndHoursFrom: '2026-06-10T21:00:00Z',
      notWorkingDateAndHoursTo: '2026-06-10T21:30:00Z',
      consulIpnHash: HASH,
    };
    // 21:00Z is 00:00 on 2026-06-11 at +03:00, so that slot is on leave
    expect(run({ ...build('2026-06-11', '+03:00', '00:00:00', '00:30:00'), notWorkingDays: [period] })).toBe(false);
    // at -05:00 the period belongs to 2026-06-10 and does not touch 2026-06-11
    expect(run({ ...build('2026-06-11', '-05:00', '00:00:00', '00:30:00'), notWorkingDays: [period] })).toBe(true);
  });

  it('handles Europe/Kyiv DST boundaries via moment.tz', () => {
    const offset = (s: string) => moment.tz(s, 'Europe/Kyiv').utcOffset();
    expect(offset('2026-03-28 12:00')).toBe(120);
    expect(offset('2026-03-30 12:00')).toBe(180);
    expect(offset('2026-10-24 12:00')).toBe(180);
    expect(offset('2026-10-26 12:00')).toBe(120);
    const dayLength = moment.tz('2026-03-30', 'Europe/Kyiv').diff(moment.tz('2026-03-29', 'Europe/Kyiv'), 'hours');
    expect(dayLength).toBe(23);
    const fallLength = moment.tz('2026-10-26', 'Europe/Kyiv').diff(moment.tz('2026-10-25', 'Europe/Kyiv'), 'hours');
    expect(fallLength).toBe(25);
  });

  it('generates slots on DST days using zone-derived offsets', () => {
    vi.setSystemTime(new Date('2026-03-20T10:00:00Z'));
    const dates: [string, string][] = [['2026-03-28', '2026-03-30'], ['2026-10-24', '2026-10-26']].map(([a, b]) => [a, b]);
    dates.forEach(([before, after]) => {
      [before, after].forEach((d) => {
        const tz = moment.tz(`${d} 12:00`, 'Europe/Kyiv').format('Z');
        expect(run(build(d, tz, '09:00:00', '10:00:00'))).toBe(true);
      });
    });
    vi.setSystemTime(new Date('2026-03-30T06:10:00Z'));
    expect(run(build('2026-03-30', '+03:00', '09:00:00', '10:00:00'))).toBe(true);
    vi.setSystemTime(new Date('2026-03-30T06:40:00Z'));
    expect(run(build('2026-03-30', '+03:00', '09:00:00', '10:00:00'))).toBe(false);
  });

  it('parseZone and utc keep the original offset for grouping', () => {
    const slot = moment.parseZone('2026-06-10T23:30:00+03:00');
    expect(slot.utcOffset()).toBe(180);
    expect(slot.format('YYYY-MM-DD HH:mm')).toBe('2026-06-10 23:30');
    expect(moment.utc(slot).format('YYYY-MM-DD HH:mm')).toBe('2026-06-10 20:30');
    expect(moment(slot).utcOffset('-05:00').format('YYYY-MM-DD HH:mm')).toBe('2026-06-10 15:30');
  });
});
