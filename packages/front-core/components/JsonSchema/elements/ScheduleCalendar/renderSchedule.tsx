/* eslint-disable no-underscore-dangle */
import { generateUUID } from 'utils/uuid';
import React from 'react';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import { IconButton, Button, Tooltip, Hidden } from '@mui/material';
import moment from 'moment-timezone';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslate } from 'react-translate';
import ScrollbarUntyped from 'components/Scrollbar';
import diff from 'helpers/diff';
import MobileDetect from 'mobile-detect';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import SouthIcon from '@mui/icons-material/South';
import NorthIcon from '@mui/icons-material/North';
import storage from 'helpers/storage';
import { ReactComponent as TodayIcon } from './assets/today.svg';
import { ReactComponent as WeekIcon } from './assets/date_range.svg';
import { ReactComponent as MonthIcon } from './assets/calendar_month.svg';
import { ReactComponent as TodayIconW } from './assets/today_w.svg';
import { ReactComponent as WeekIconW } from './assets/date_range_w.svg';
import { ReactComponent as MonthIconW } from './assets/calendar_month_w.svg';
import { ReactComponent as ArrowLeft } from './assets/Arrow_left.svg';
import { ReactComponent as ArrowRight } from './assets/Arrow_right.svg';
import { ReactComponent as ArrowLeftSm } from './assets/arrow_left_sm.svg';
import { ReactComponent as ArrowRightSm } from './assets/arrow_right_sm.svg';
import { ReactComponent as ChevronRight } from './assets/chevron_right.svg';
import { ReactComponent as ChevronRight2 } from './assets/chevron_right_2.svg';
import { ReactComponent as ChevronRight2w } from './assets/chevron_right_2_w.svg';

const Scrollbar = ScrollbarUntyped as unknown as React.ComponentType<Record<string, unknown>>;

const useStyles = makeStyles((theme: Theme) => ({
  togglePeriod: {
    borderRadius: 40,
    padding: 8,
    background: '#F1F1F1',
    [theme.breakpoints.down('sm')]: {
      float: 'none',
      display: 'flex',
      justifyContent: 'space-between',
    },
  },
  periodButton: {
    padding: 12,
    [theme.breakpoints.down('sm')]: {
      borderRadius: 40,
      fontSize: 10,
      fontWeight: 400,
      lineHeight: '14px',
      letterSpacing: '-0.2px',
      flex: 1,
      justifyContent: 'space-evenly',
      height: 40,
    },
  },
  startIcon: {
    margin: 0,
  },
  activePeriod: {
    background: '#000',
    color: '#fff',
    '&:hover': {
      background: '#000',
    },
  },
  scheduleContainerWrapper: {
    display: 'flex',
    marginBottom: 58,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 30,
    },
  },
  scheduleContainerWrapperFixed: {
    marginBottom: 15,
  },
  navigationWrapper: {
    position: 'relative',
    clear: 'both',
    '& .ps__thumb-x': {
      backgroundColor: '#000',
      opacity: 1,
    },
    '& .ps__rail-x.ps--clicking .ps__thumb-x': {
      backgroundColor: '#000',
      opacity: 1,
    },
    '& .ps__rail-x:hover > .ps__thumb-x': {
      backgroundColor: '#000',
      opacity: 1,
    },
  },
  daysNavigation: {
    position: 'absolute',
    right: 0,
    bottom: -19,
    zIndex: 1291,
    [theme.breakpoints.down('sm')]: {
      bottom: -9,
    },
  },
  arrowButton: {
    padding: 4,
    [theme.breakpoints.down('sm')]: {
      width: 32,
      height: 32,
      padding: 0,
      '&:first-child': {
        marginRight: 8,
      },
    },
  },
  dayItem: {
    padding: '10px 19px',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '8px',
    background: '#F1F1F1',
    marginRight: 8,
    marginBottom: 36,
    cursor: 'pointer',
    border: '2px solid #F1F1F1',
    textTransform: 'capitalize',
    width: 130,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 30,
      width: 'unset',
      maxWidth: 120,
      padding: '8px 19px',
    },
  },
  headline: {
    fontSize: 16,
    lineHeight: '24px',
    color: '#000000',
    fontWeight: '400',
    textAlign: 'center',
    [theme.breakpoints.down('sm')]: {
      fontSize: 13,
      lineHeight: '18px',
      letterSpacing: '-0.26px',
    },
  },
  dayItemWeek: {
    lineHeight: '20px',
  },
  active: {
    border: '2px solid #000',
    background: '#FFF',
    cursor: 'default',
  },
  activeHeadline: {
    fontSize: 28,
    fontWeight: 400,
    lineHeight: '32px',
    marginBottom: 32,
    textTransform: 'capitalize',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    [theme.breakpoints.down('sm')]: {
      fontSize: 18,
      lineHeight: '24px',
      marginBottom: 10,
      letterSpacing: '-0.36px',
      display: 'block',
    },
  },
  activeHeadlineAdd: {
    marginTop: 24,
    [theme.breakpoints.down('sm')]: {
      marginTop: 2,
    },
  },
  activeHeadlineWeekPeriod: {
    fontWeight: 400,
    fontSize: 16,
    lineHeight: '24px',
    padding: '6px 8px',
  },
  slotsWrapper: {
    display: 'flex',
    maxWidth: 640,
    flexWrap: 'wrap',
    marginBottom: 32,
    [theme.breakpoints.down('sm')]: {
      justifyContent: 'space-between',
    },
  },
  slotItem: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    cursor: 'pointer',
    width: 126,
    height: 46,
    border: '2px solid transparent',
    background: '#D3E5FF',
    '&:hover': {
      border: '2px solid #000',
    },
    [theme.breakpoints.down('sm')]: {
      width: 'calc(50% - 4px)',
      fontSize: 13,
      fontStyle: 'normal',
      fontWeight: 300,
      lineHeight: '18px',
      letterSpacing: '-0.26px',
      height: 40,
      margin: 0,
      padding: 0,
      marginBottom: 8,
    },
  },
  slotItemDisabled: {
    background: '#F1F1F1',
    color: '#6E6E6E',
  },
  hoverDisabled: {
    pointerEvents: 'all',
  },
  customTooltip: {
    backgroundColor: '#3C4043',
    color: '#FFF',
  },
  slotItemChosen: {
    background: '#000',
    border: '2px solid #000',
    color: '#FFF',
  },
  hoveredSlot: {
    background: '#000',
    border: '2px solid #000',
    color: '#FFF',
  },
  activeSubHeadline: {
    fontSize: 18,
    fontWeight: 400,
    lineHeight: '24px',
    marginBottom: 16,
    textTransform: 'capitalize',
    display: 'flex',
    justifyContent: 'space-between',
    maxWidth: 545,
    [theme.breakpoints.down('sm')]: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: '20px',
      letterSpacing: '-0.32px',
      display: 'block',
    },
  },
  showMoreButton: {
    marginBottom: 56,
    marginTop: 10,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 32,
      fontSize: 13,
      fontWeight: 400,
      lineHeight: '18px',
      letterSpacing: '-0.26px',
    },
  },
  arrowButtonToDay: {
    marginLeft: 8,
    color: '#000',
  },
  attentionWrapperBlock: {
    maxWidth: 528,
    display: 'inline-flex',
    background: 'rgb(255, 244, 215)',
    padding: 22,
    paddingRight: 25,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: '18px',
    marginBottom: 56,
  },
  infoIcon: {
    fontSize: 38,
    marginRight: 16,
    position: 'relative',
    top: 12,
  },
  hoverOn: {
    display: 'none',
  },
  weekWrapper: {
    padding: 16,
    cursor: 'pointer',
    border: '2px solid #000',
    marginBottom: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    '&:hover': {
      background: '#000',
      '& $weekName': {
        color: '#FFF',
      },
      '& svg': {
        color: '#FFF',
      },
      '& $hoverOn': {
        display: 'block',
      },
      '& $hoverOff': {
        display: 'none',
      },
    },
  },
  weekName: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: '20px',
    letterSpacing: '-0.3px',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  freeSlots: {
    background: '#15CF74',
    fontSize: 11,
    fontWeight: 400,
    lineHeight: '16px',
    textTransform: 'uppercase',
    color: '#000',
    padding: 4,
    float: 'left',
  },
  formRoot: {
    marginBottom: 8,
    alignItems: 'end',
    maxWidth: 545,
    '& svg': {
      color: '#000',
    },
    [theme.breakpoints.down('sm')]: {
      maxWidth: 'unset',
      alignItems: 'flex-start',
    },
  },
  formGroupLabel: {
    textTransform: 'initial',
    [theme.breakpoints.down('sm')]: {
      fontSize: 13,
      fontWeight: 400,
      lineHeight: '18px',
      letterSpacing: '-0.26px',
    },
  },
  maxWidthUnset: {
    maxWidth: 'unset',
    margin: 0,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 8,
      borderBottom: '2px solid #000',
    },
  },
  marginSm: {
    [theme.breakpoints.down('sm')]: {
      marginBottom: 16,
    },
  },
  fullWidthSlots: {
    display: 'block',
  },
  fullWidthSlot: {
    width: '100%',
    height: 'unset',
    justifyContent: 'flex-start',
    padding: '11px 16px',
    flexDirection: 'column',
    alignItems: 'baseline',
  },
  descriptionLabel: {
    fontSize: 38,
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: '40px',
    maxWidth: 800,
    [theme.breakpoints.down('sm')]: {
      fontSize: 20,
      lineHeight: '24px',
      letterSpacing: '-0.4px',
      marginBottom: 16,
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 16,
      display: 'block',
    },
  },
  cutText: {
    wordBreak: 'break-all',
    display: '-webkit-box',
    '-webkit-box-orient': 'vertical',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    '-webkit-line-clamp': 1,
    '-webkit-user-select': 'none',
    '-ms-user-select': 'none',
    userSelect: 'none',
  },
  fixPositionOnScroll: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1291,
    width: '100%',
    paddingLeft: 16,
    paddingRight: 16,
    background: '#FFF',
    margin: 0,
  },
  scrollBarFixed: {
    position: 'fixed',
    left: 0,
    top: 70,
    zIndex: 1291,
    width: '100%',
    paddingLeft: 16,
    paddingRight: 16,
    background: '#FFF',
    paddingTop: 16,
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
  },
  fixedDaysNavigation: {
    position: 'fixed',
    top: 149,
    right: 14,
    height: 32,
  },
  endOfHour: {
    marginBottom: 32,
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      marginBottom: 16,
    },
  },
  attentionWrapperBlockMargin: {
    marginBottom: 32,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 16,
    },
  },
  noMargin: {
    marginBottom: 0,
  },
}));

const WEEK_SLOTS_LIMIT = 20;

interface Slot {
  id?: string;
  start: string;
  end?: string;
  timeZone?: string;
  disabled?: boolean;
  title?: string;
  renderStart?: string;
  renderEnd?: string;
  [key: string]: unknown;
}

interface RenderScheduleProps {
  scheduleDays: Record<string, unknown>;
  generateSlots: (day: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
  // Passed by the parent (`index.tsx`'s `weekCount` callback) but never read
  // here — same "accepted but never read" pass-through as elsewhere in this
  // migration; documented rather than cast away at the one call site.
  weekCount?: (weekDays: Array<Record<string, unknown>>) => number;
  toggleDisabled: boolean;
  handleChange: (slotOrSlots: Slot | Slot[], day?: string, save?: boolean) => void;
  choseAllDay: boolean;
  chosenSlots: Array<Record<string, unknown>>;
  handleClearData: () => void;
  chosenDays: string[];
  handleOpenDialog?: unknown;
  description: string;
  shiftChose: boolean;
  chosenStatusExtendEval: (slot: Slot) => unknown;
  setUserGeneratedDays: (
    updater: (prev: Record<string, number>) => Record<string, number>,
  ) => void;
  readOnly?: boolean;
  slotsText?: string;
  ignoreTimezone?: boolean;
}

const RenderSchedule = ({
  scheduleDays,
  generateSlots,
  toggleDisabled,
  handleChange,
  choseAllDay,
  chosenSlots,
  handleClearData,
  chosenDays,
  handleOpenDialog,
  description,
  shiftChose,
  chosenStatusExtendEval,
  setUserGeneratedDays,
  readOnly,
  slotsText,
  ignoreTimezone,
}: RenderScheduleProps) => {
  const t = useTranslate('ScheduleCalendar');
  const [activeDay, setActiveDay] = React.useState<string | null>(null);
  const [activeWeek, setActiveWeek] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [filteredByTimeZoneSLots, setFilteredByTimeZoneSLots] = React.useState<
    Record<string, Slot[]>
  >({});
  const [period, setPeriod] = React.useState('day');
  const [weekSlots, setWeekSlots] = React.useState<Record<string, Slot[]>>({});
  const [showMore, setShowMore] = React.useState<string | false>(false);
  const [activeMonth, setActiveMonth] = React.useState<string | null>(null);
  const [monthSlots, setMonthSlots] = React.useState<Record<string, { count: number }>>({});
  const [fixedDaysNavigation, setFixedDaysNavigation] = React.useState(false);
  const [highlightStart, setHighlightStart] = React.useState<number | null>(null);
  const [highlighters, setHighlighters] = React.useState<Slot[]>([]);
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    return !!md.mobile();
  });
  const navigationRef = React.useRef<HTMLDivElement>(null);
  const scrollBarRef = useSelector(
    (state: { app?: { calendarScrollBarRef?: { _container?: HTMLElement } } }) =>
      state?.app?.calendarScrollBarRef,
  );
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const classes = useStyles();

  const daysList = React.useMemo(
    () =>
      Object.keys(scheduleDays || {}).sort((a, b) => moment(a).diff(moment(b))),
    [scheduleDays],
  );

  const focusActiveItem = React.useCallback(() => {
    if (!scrollBarRef?._container) return;

    const activeDayItem = scrollBarRef._container.querySelector(
      `.${classes.active}`,
    );

    if (!activeDayItem) return;

    const itemsBeforeActive = Array.from(
      scrollBarRef._container.querySelectorAll(`.${classes.dayItem}`),
    ).filter((item) => {
      if (!item) return false;
      return (
        item.getBoundingClientRect().left <
        activeDayItem.getBoundingClientRect().left
      );
    });

    const itemWidth = activeDayItem.getBoundingClientRect().width;

    const scrollPosition = itemsBeforeActive.length * itemWidth - itemWidth;

    scrollBarRef._container.scrollLeft = scrollPosition;
  }, [classes, scrollBarRef]);

  const filterSlotsIncludingTimeZone = React.useCallback(
    (day: string, newSlots: Slot[]) => {
      const activeSlots = newSlots.filter((slot) => {
        // `.parseZone(x)` here is an instance method call whose argument moment.js
        // ignores at runtime (the real "reparse preserving original offset" call takes no
        // arguments) — preserved verbatim from the original source, just without the
        // inert argument since TypeScript's real moment types reject the extra arity.
        const start = ignoreTimezone
          ? moment(slot.start).parseZone().format('DD.MM.YYYY')
          : moment(slot.start).utcOffset(slot.timeZone as string).format('DD.MM.YYYY');
        return start === day;
      });

      const slotsOutsideActiveDay = newSlots.filter((slot) => {
        const start = ignoreTimezone
          ? moment(slot.start).parseZone().format('DD.MM.YYYY')
          : moment(slot.start).utcOffset(slot.timeZone as string).format('DD.MM.YYYY');
        return start !== day;
      });

      return {
        activeSlots,
        slotsOutsideActiveDay,
      };
    },
    [ignoreTimezone],
  );

  const prepareSlots = React.useCallback(
    (active: string) => {
      const closestDay =
        daysList.find((d) => moment(d).isSameOrAfter(moment(active), 'day')) ||
        active;

      const day = moment(closestDay).format('DD.MM.YYYY');

      const newSlots = (generateSlots((scheduleDays as Record<string, unknown>)[closestDay] as Array<Record<string, unknown>>) as Slot[]).sort((a, b) =>
        moment(a.start).diff(moment(b.start)),
      );

      const { activeSlots, slotsOutsideActiveDay } =
        filterSlotsIncludingTimeZone(day, newSlots);

      setActiveDay(day);
      setSlots(activeSlots);

      setUserGeneratedDays((e) => ({
        ...e,
        [day]: activeSlots.filter((slot) => !slot.disabled).length,
      }));

      setFilteredByTimeZoneSLots((e) => ({
        ...e,
        [day]: slotsOutsideActiveDay,
      }));
      storage.setItem('activeDay', day);
    },
    [
      generateSlots,
      scheduleDays,
      daysList,
      filterSlotsIncludingTimeZone,
      setUserGeneratedDays,
    ],
  );

  const generateScheduleDaysByWeek = React.useCallback(
    (week: string[], weekTitle: string) => {
      const filteredSlots: Record<string, Slot[]> = {};

      const newSlots = (week || []).reduce((acc: Record<string, Slot[]>, day) => {
        const newDay = moment(day).format('DD.MM.YYYY');
        const daySlots = (generateSlots((scheduleDays as Record<string, unknown>)[day] as Array<Record<string, unknown>>) as Slot[]).sort((a, b) =>
          moment(a.start).diff(moment(b.start)),
        );
        const { activeSlots, slotsOutsideActiveDay } =
          filterSlotsIncludingTimeZone(newDay, daySlots);
        acc[newDay] = activeSlots;
        filteredSlots[newDay] = slotsOutsideActiveDay;
        return acc;
      }, {});

      setWeekSlots(newSlots);
      setFilteredByTimeZoneSLots((e) => ({
        ...e,
        ...filteredSlots,
      }));
      setActiveWeek(weekTitle);
      storage.setItem('activeWeek', weekTitle);
    },
    [generateSlots, scheduleDays, filterSlotsIncludingTimeZone],
  );

  const groupScheduleDaysByWeek = React.useMemo(
    () =>
      daysList.reduce((acc: Record<string, string[]>, day) => {
        const currentDay = moment(day);
        const weekStart = currentDay
          .clone()
          .startOf('week')
          .format('YYYY-MM-DD');
        const weekEnd = currentDay.clone().endOf('week').format('YYYY-MM-DD');

        const itemName = `${moment(weekStart).format('DD.MM.YYYY')} — ${moment(
          weekEnd,
        ).format('DD.MM.YYYY')}`;

        if (!acc[itemName]) {
          acc[itemName] = [];
        }

        acc[itemName].push(day);

        return acc;
      }, {}),
    [daysList],
  );

  const groupScheduleWeeksByMonth = React.useMemo(
    () =>
      Object.keys(groupScheduleDaysByWeek).reduce((acc: Record<string, string[]>, week) => {
        const currentWeek = moment(week.split(' - ')[0], 'DD.MM.YYYY');
        const month = currentWeek.format('MMMM');
        const year = currentWeek.format('YYYY');

        const itemName = `${month} ${year}`;

        if (!acc[itemName]) {
          acc[itemName] = [];
        }

        acc[itemName].push(week);

        return acc;
      }, {}),
    [groupScheduleDaysByWeek],
  );

  const generateScheduleWeeksByMonth = React.useCallback(
    (weeks: string[], month: string) => {
      const newSlots = (weeks || []).reduce((acc: Record<string, { count: number }>, week) => {
        const totalCount = groupScheduleDaysByWeek[week].reduce(
          (array: number, day) => {
            array += (generateSlots((scheduleDays as Record<string, unknown>)[day] as Array<Record<string, unknown>>) as Slot[]).filter(
              (slot) => !slot.disabled,
            ).length;
            return array;
          },
          0,
        );

        acc[week] = {
          count: totalCount,
        };

        return acc;
      }, {});

      setActiveMonth(month);
      setMonthSlots(newSlots);
      storage.setItem('activeMonth', month);
    },
    [generateSlots, scheduleDays, groupScheduleDaysByWeek],
  );

  const handleChangePeriod = React.useCallback(
    (newPeriod: string, noGenerate?: boolean) => {
      if (newPeriod === 'week') {
        if (!noGenerate) {
          generateScheduleDaysByWeek(
            groupScheduleDaysByWeek[Object.keys(groupScheduleDaysByWeek)[0]],
            Object.keys(groupScheduleDaysByWeek)[0],
          );
        }
      }

      if (newPeriod === 'month') {
        if (!noGenerate) {
          generateScheduleWeeksByMonth(
            groupScheduleWeeksByMonth[
              Object.keys(groupScheduleWeeksByMonth)[0]
            ],
            Object.keys(groupScheduleWeeksByMonth)[0],
          );
        }
      }

      setPeriod(newPeriod);
      storage.setItem('activePeriod', newPeriod);
    },
    [
      generateScheduleDaysByWeek,
      groupScheduleDaysByWeek,
      generateScheduleWeeksByMonth,
      groupScheduleWeeksByMonth,
    ],
  );

  const handleChangeDay = React.useCallback(
    (day: string) => {
      prepareSlots(day);
    },
    [prepareSlots],
  );

  const incrementDay = React.useCallback(() => {
    const nextExist =
      daysList.findIndex(
        (day) => day === moment(activeDay, 'DD.MM.YYYY').format('YYYY-MM-DD'),
      ) + 1;

    if (nextExist >= daysList.length) return;

    handleChangeDay(daysList[nextExist]);

    focusActiveItem();
  }, [activeDay, daysList, handleChangeDay, focusActiveItem]);

  const decrementDay = React.useCallback(() => {
    const nextExist =
      daysList.findIndex(
        (day) => day === moment(activeDay, 'DD.MM.YYYY').format('YYYY-MM-DD'),
      ) - 1;

    if (nextExist < 0) return;

    handleChangeDay(daysList[nextExist]);

    focusActiveItem();
  }, [activeDay, daysList, handleChangeDay, focusActiveItem]);

  const incrementWeek = React.useCallback(() => {
    const keys = Object.keys(groupScheduleDaysByWeek);
    const currentIndex = keys.indexOf(activeWeek as string);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= keys.length) return;

    generateScheduleDaysByWeek(
      groupScheduleDaysByWeek[keys[nextIndex]],
      keys[nextIndex],
    );
    focusActiveItem();
  }, [
    activeWeek,
    groupScheduleDaysByWeek,
    generateScheduleDaysByWeek,
    focusActiveItem,
  ]);

  const decrementWeek = React.useCallback(() => {
    const keys = Object.keys(groupScheduleDaysByWeek);
    const currentIndex = keys.indexOf(activeWeek as string);
    const nextIndex = currentIndex - 1;

    if (nextIndex < 0) return;

    generateScheduleDaysByWeek(
      groupScheduleDaysByWeek[keys[nextIndex]],
      keys[nextIndex],
    );
    focusActiveItem();
  }, [
    activeWeek,
    groupScheduleDaysByWeek,
    generateScheduleDaysByWeek,
    focusActiveItem,
  ]);

  const incrementMonth = React.useCallback(() => {
    const keys = Object.keys(groupScheduleWeeksByMonth);
    const currentIndex = keys.indexOf(activeMonth as string);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= keys.length) return;

    generateScheduleWeeksByMonth(
      groupScheduleWeeksByMonth[keys[nextIndex]],
      keys[nextIndex],
    );
    focusActiveItem();
  }, [
    activeMonth,
    groupScheduleWeeksByMonth,
    generateScheduleWeeksByMonth,
    focusActiveItem,
  ]);

  const decrementMonth = React.useCallback(() => {
    const keys = Object.keys(groupScheduleWeeksByMonth);
    const currentIndex = keys.indexOf(activeMonth as string);
    const nextIndex = currentIndex - 1;

    if (nextIndex < 0) return;

    generateScheduleWeeksByMonth(
      groupScheduleWeeksByMonth[keys[nextIndex]],
      keys[nextIndex],
    );
    focusActiveItem();
  }, [
    activeMonth,
    groupScheduleWeeksByMonth,
    generateScheduleWeeksByMonth,
    focusActiveItem,
  ]);

  const handleChooseAllDay = React.useCallback(
    (day: string, save?: boolean) => {
      switch (period) {
        case 'week':
          handleChange(weekSlots[day], day, save);
          break;
        default:
          handleChange(slots, day, save);
          break;
      }
    },
    [period, slots, handleChange, weekSlots],
  );

  const renderSlot = React.useCallback(
    (source: Slot[], callback: (index: number) => boolean = () => false) => {
      const currentDay = moment(source[0]?.start).format('DD.MM.YYYY');

      const additionalSlots = filteredByTimeZoneSLots[currentDay] || [];
      const addSlotsDay = (additionalSlots[0] || {}) as Slot;

      const handleClick = (event: React.MouseEvent, slot: Slot) => {
        if (slot.disabled && !toggleDisabled) return;
        if (event.shiftKey && shiftChose) {
          const slotIndex = source.findIndex(({ id }) => id === slot.id);

          if (highlightStart || highlightStart === 0) {
            const slotsToSelect = source.slice(
              Math.min(highlightStart, slotIndex),
              Math.max(highlightStart, slotIndex) + 1,
            );

            handleChange(
              slotsToSelect,
              moment(slot.start).format('DD.MM.YYYY'),
            );

            setHighlightStart(null);
            setHighlighters([]);
          } else {
            setHighlightStart(slotIndex);
          }
        } else {
          handleChange(slot, moment(slot.start).format('DD.MM.YYYY'));
        }
      };

      const onMouseEnter = (event: React.MouseEvent, slot: Slot) => {
        if (event.shiftKey) {
          if (timeout.current) clearTimeout(timeout.current);
          if (highlightStart) {
            const end = source.findIndex(({ id }) => id === slot.id);

            const slotsToSelect = source.slice(
              Math.min(highlightStart, end),
              Math.max(highlightStart, end) + 1,
            );

            setHighlighters(slotsToSelect);
          }
        }
      };

      const onMouseLeave = () => {
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => {
          setHighlighters([]);
        }, 100);
      };

      const slotTitle = (slot: Slot) => (
        <div>
          {Boolean(handleOpenDialog) && (
            <div>
              {slot.renderStart}
              {' - '}
              {slot.renderEnd}
            </div>
          )}
          <span className={classes.cutText}>{slot.title}</span>
        </div>
      );

      const slotHtml = (slot: Slot) => {
        const disableTitle = t('DisableTitle', { slot: slot.title });
        return (
          <>
            {slot.start.split(':')[1] === '00' && !isMobile ? (
              <div className={classes.endOfHour} />
            ) : null}

            <div
              key={generateUUID()}
              tabIndex={0}
              aria-label={slot?.disabled ? disableTitle : slot.title}
              role="button"
              className={classNames({
                [classes.slotItem]: true,
                [classes.fullWidthSlot]: !!handleOpenDialog,
                [classes.slotItemDisabled]: !!slot?.disabled,
                [classes.slotItemChosen]: !!(
                  chosenSlots?.find((item) => item?.id === slot.id) ||
                  chosenStatusExtendEval(slot)
                ),
                [classes.hoveredSlot]: !!highlighters.find(
                  ({ id }) => id === slot.id,
                ),
                [classes.hoverDisabled]: toggleDisabled,
              })}
              onClick={(event) => handleClick(event, slot)}
              onMouseEnter={(event) => onMouseEnter(event, slot)}
              onMouseLeave={() => onMouseLeave()}
            >
              {slot.disabled ? (
                <Tooltip title={disableTitle} placement="top" classes={{ tooltip: classes.customTooltip }}>
                  {slotTitle(slot)}
                </Tooltip>
              ) : (
                slotTitle(slot)
              )}
            </div>
          </>
        );
      };

      return (
        <>
          <div
            className={classNames({
              [classes.slotsWrapper]: true,
              [classes.fullWidthSlots]: !!handleOpenDialog,
            })}
          >
            {source.map((slot, index) => {
              if (callback(index)) {
                return null;
              }

              return <>{slotHtml(slot)}</>;
            })}
          </div>

          {additionalSlots.length ? (
            <>
              <div
                className={classNames({
                  [classes.activeHeadline]: true,
                  [classes.activeHeadlineAdd]: true,
                  [classes.activeHeadlineWeekPeriod]: period === 'week',
                })}
              >
                <div>
                  {moment(addSlotsDay.start)
                    .utcOffset(addSlotsDay.timeZone as string)
                    .format('dddd')}{' '}
                  {moment(addSlotsDay.start)
                    .utcOffset(addSlotsDay.timeZone as string)
                    .format('DD.MM.YYYY')}
                </div>
              </div>

              <div
                className={classNames({
                  [classes.slotsWrapper]: true,
                  [classes.fullWidthSlots]: !!handleOpenDialog,
                })}
              >
                {additionalSlots.map(slotHtml)}
              </div>
            </>
          ) : null}
        </>
      );
    },
    [
      classes,
      timeout,
      isMobile,
      chosenStatusExtendEval,
      period,
      toggleDisabled,
      shiftChose,
      highlightStart,
      highlighters,
      handleChange,
      chosenSlots,
      handleOpenDialog,
      filteredByTimeZoneSLots,
    ],
  );

  const toggleDayButton = React.useCallback(
    (day: string) => {
      if (!choseAllDay) return null;

      const onChange = (event: React.SyntheticEvent) => {
        handleChooseAllDay(day, (event.target as HTMLInputElement).checked);
      };

      const checked = chosenDays.includes(day);

      return (
        <FormGroup classes={{ root: classes.formRoot }}>
          <FormControlLabel
            control={<Checkbox />}
            label={t(checked ? 'ClearAll' : 'ChooseAll')}
            checked={checked}
            classes={{ label: classes.formGroupLabel }}
            onChange={onChange}
          />
        </FormGroup>
      );
    },
    [classes, choseAllDay, t, handleChooseAllDay, chosenDays],
  );

  const renderClearData = React.useCallback(() => {
    if (!chosenSlots.length) return null;

    return (
      <FormGroup
        classes={{
          root: classNames({
            [classes.formRoot]: true,
            [classes.maxWidthUnset]: true,
          }),
        }}
      >
        <FormControlLabel
          classes={{ label: classes.formGroupLabel }}
          control={<Checkbox disabled={readOnly} />}
          label={t('ClearData')}
          onChange={handleClearData}
        />
      </FormGroup>
    );
  }, [t, classes, chosenSlots, handleClearData, readOnly]);

  const renderInfo = React.useCallback(
    (icon?: string, test?: string) => (
      <div
        className={classNames({
          [classes.attentionWrapperBlock]: true,
          [classes.attentionWrapperBlockMargin]: !!icon,
        })}
      >
        <span role="img" aria-label="shrug" className={classes.infoIcon}>
          {icon || '😔'}
        </span>
        {/* `attentionText` is never defined in `useStyles` above — a pre-existing
            dead className reference preserved as-is; cast avoids a hard TS error
            for an index that was never real at runtime either. */}
        <p className={(classes as Record<string, string>).attentionText}>{t(test || 'EmptySlotsDay')}</p>
      </div>
    ),
    [classes, t],
  );

  const renderIncrement = React.useCallback(
    (action: () => void) => (
      <IconButton className={classes.arrowButton} onClick={action}>
        <Hidden smDown={true}>
          <ArrowLeft />
        </Hidden>
        <Hidden smUp={true}>
          <ArrowLeftSm />
        </Hidden>
      </IconButton>
    ),
    [classes],
  );

  const renderDecrement = React.useCallback(
    (action: () => void) => (
      <IconButton className={classes.arrowButton} onClick={action}>
        <Hidden smDown={true}>
          <ArrowRight />
        </Hidden>
        <Hidden smUp={true}>
          <ArrowRightSm />
        </Hidden>
      </IconButton>
    ),
    [classes],
  );

  const ScrollBarWrapper = React.useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <Scrollbar
        className={classNames({
          [classes.scheduleContainerWrapper]: true,
          [classes.scheduleContainerWrapperFixed]: fixedDaysNavigation,
        })}
        saveRef={'calendarScrollBarRef'}
      >
        {children}
      </Scrollbar>
    ),
    [classes, fixedDaysNavigation],
  );

  React.useEffect(() => {
    if (!isMobile) return;

    let togglePosition = 0;

    const toggleClass = () => {
      try {
        if (navigationRef.current) {
          const rect = navigationRef.current.getBoundingClientRect();

          if (rect.top <= 16 && !togglePosition) {
            togglePosition = window.scrollY;
          }

          if (!togglePosition) return;

          setFixedDaysNavigation(window.scrollY > togglePosition);
        }
      } catch (e) {
        console.error('toggleClass', e);
      }
    };

    window.addEventListener('scroll', toggleClass);

    return () => {
      window.removeEventListener('scroll', toggleClass);
    };
  }, [navigationRef, classes, isMobile]);

  React.useEffect(() => {
    if (daysList.length && !activeDay) {
      prepareSlots(
        storage.getItem('activeDay')
          ? moment(storage.getItem('activeDay') as string, 'DD.MM.YYYY').format(
              'YYYY-MM-DD',
            )
          : moment().format('YYYY-MM-DD'),
      );
    }

    if (
      daysList.length &&
      !activeWeek &&
      storage.getItem('activePeriod') === 'week'
    ) {
      const week =
        (storage.getItem('activeWeek') as string) ||
        Object.keys(groupScheduleDaysByWeek)[0];
      handleChangePeriod('week', true);
      generateScheduleDaysByWeek(groupScheduleDaysByWeek[week], week);
    }

    if (
      daysList.length &&
      !activeMonth &&
      (!storage.getItem('activePeriod') ||
        storage.getItem('activePeriod') === 'month')
    ) {
      const month =
        (storage.getItem('activeMonth') as string) ||
        Object.keys(groupScheduleWeeksByMonth)[0];
      handleChangePeriod('month', true);
      generateScheduleWeeksByMonth(groupScheduleWeeksByMonth[month], month);
    }

    setTimeout(() => {
      focusActiveItem();
    }, 100);
  }, [
    activeDay,
    focusActiveItem,
    daysList,
    prepareSlots,
    activeWeek,
    handleChangePeriod,
    generateScheduleDaysByWeek,
    groupScheduleDaysByWeek,
    activeMonth,
    generateScheduleWeeksByMonth,
    groupScheduleWeeksByMonth,
  ]);

  const monthIsFuture = React.useMemo(
    () => moment().isBefore(moment(activeMonth as string, 'MMMM YYYY')),
    [activeMonth],
  );
  const monthIsCurrent = React.useMemo(
    () => moment().isSame(moment(activeMonth as string, 'MMMM YYYY'), 'month'),
    [activeMonth],
  );

  const togglePeriodDate = React.useMemo(
    () => [
      {
        title: t('Day'),
        value: 'day',
        icon: <TodayIcon />,
        iconW: <TodayIconW />,
      },
      {
        title: t('Week'),
        value: 'week',
        icon: <WeekIcon />,
        iconW: <WeekIconW />,
      },
      {
        title: t('Month'),
        value: 'month',
        icon: <MonthIcon />,
        iconW: <MonthIconW />,
      },
    ],
    [t],
  );

  if (!daysList.length || !activeDay) {
    return null;
  }

  return (
    <>
      <div
        ref={navigationRef}
        className={classNames({
          [classes.header]: true,
          [classes.fixPositionOnScroll]: fixedDaysNavigation,
        })}
      >
        <div className={classes.descriptionLabel}>{description}</div>
        <div
          className={classNames({
            [classes.togglePeriod]: true,
          })}
        >
          <Hidden smDown={true}>
            {togglePeriodDate.map(({ title, value, icon, iconW }) => (
              <Tooltip title={title} key={generateUUID()}>
                <IconButton
                  className={classNames({
                    [classes.periodButton]: true,
                    [classes.activePeriod]: period === value,
                  })}
                  onClick={() => handleChangePeriod(value)}
                >
                  {period === value ? iconW : icon}
                </IconButton>
              </Tooltip>
            ))}
          </Hidden>
          <Hidden smUp={true}>
            {togglePeriodDate.map(({ title, value, icon, iconW }) => (
              <Button
                key={generateUUID()}
                className={classNames({
                  [classes.periodButton]: true,
                  [classes.activePeriod]: period === value,
                })}
                classes={{
                  startIcon: classes.startIcon,
                }}
                onClick={() => handleChangePeriod(value)}
                startIcon={period === value ? iconW : icon}
              >
                {title}
              </Button>
            ))}
          </Hidden>
        </div>
      </div>

      {period === 'day' ? (
        <>
          <div
            className={classNames({
              [classes.navigationWrapper]: true,
              [classes.scrollBarFixed]: fixedDaysNavigation,
            })}
          >
            <ScrollBarWrapper>
              {daysList.map((day) => {
                const currentDay = moment(day);

                return (
                  <div
                    key={generateUUID()}
                    className={classNames({
                      [classes.dayItem]: true,
                      [classes.active]:
                        activeDay === currentDay.format('DD.MM.YYYY'),
                    })}
                    onClick={() => prepareSlots(day)}
                  >
                    <div className={classes.headline}>
                      {currentDay.format('dddd')}
                    </div>
                    <div className={classes.headline}>
                      {currentDay.format('DD.MM.YYYY')}
                    </div>
                  </div>
                );
              })}
            </ScrollBarWrapper>

            <div
              className={classNames({
                [classes.daysNavigation]: true,
                [classes.fixedDaysNavigation]: fixedDaysNavigation,
              })}
            >
              {renderIncrement(decrementDay)}
              {renderDecrement(incrementDay)}
            </div>
          </div>

          <div className={classes.activeHeadline}>
            <div>
              {moment(activeDay, 'DD.MM.YYYY').format('dddd')} {activeDay}
            </div>

            {renderClearData()}
          </div>

          {shiftChose ? renderInfo('☝️', 'ShiftChose') : null}

          {!slots.length ? (
            renderInfo()
          ) : (
            <>
              {toggleDayButton(activeDay)}
              {renderSlot(slots)}
            </>
          )}
        </>
      ) : null}

      {period === 'week' ? (
        <>
          <div
            className={classNames({
              [classes.navigationWrapper]: true,
              [classes.scrollBarFixed]: fixedDaysNavigation,
            })}
          >
            <ScrollBarWrapper>
              {Object.keys(groupScheduleDaysByWeek).map((week) => (
                <div
                  key={generateUUID()}
                  className={classNames({
                    [classes.dayItem]: true,
                    [classes.active]: !diff(
                      groupScheduleDaysByWeek[activeWeek as string],
                      groupScheduleDaysByWeek[week],
                    ),
                  })}
                  onClick={() =>
                    generateScheduleDaysByWeek(
                      groupScheduleDaysByWeek[week],
                      week,
                    )
                  }
                >
                  <div
                    className={classNames({
                      [classes.headline]: true,
                      [classes.dayItemWeek]: true,
                    })}
                  >
                    {week}
                  </div>
                </div>
              ))}
            </ScrollBarWrapper>

            <div
              className={classNames({
                [classes.daysNavigation]: true,
                [classes.fixedDaysNavigation]: fixedDaysNavigation,
              })}
            >
              {renderIncrement(decrementWeek)}
              {renderDecrement(incrementWeek)}
            </div>
          </div>
          <>
            <div
              className={classNames({
                [classes.activeHeadline]: true,
                [classes.marginSm]: true,
              })}
            >
              <div>
                {t('Week')} {activeWeek}
              </div>
              {renderClearData()}
            </div>

            {Object.keys(weekSlots || {}).map((day) => {
              if (!weekSlots[day].length) return null;
              const showMoreButton = weekSlots[day].length > WEEK_SLOTS_LIMIT;
              const expanded =
                moment(day, 'DD.MM.YYYY').format('dddd') === showMore;

              return (
                <div key={generateUUID()}>
                  <div className={classes.activeSubHeadline}>
                    <Button
                      onClick={() => {
                        handleChangePeriod('day');
                        prepareSlots(
                          moment(day, 'DD.MM.YYYY').format('YYYY-MM-DD'),
                        );
                      }}
                      endIcon={<ChevronRight />}
                    >
                      {moment(day, 'DD.MM.YYYY').format('dddd')}
                      {', '}
                      {day}
                    </Button>

                    {toggleDayButton(day)}
                  </div>

                  {renderSlot(weekSlots[day], (index) => {
                    if (expanded) {
                      return false;
                    }
                    return index >= WEEK_SLOTS_LIMIT;
                  })}

                  {showMoreButton ? (
                    <Button
                      className={classes.showMoreButton}
                      onClick={() =>
                        setShowMore(
                          expanded
                            ? false
                            : moment(day, 'DD.MM.YYYY').format('dddd'),
                        )
                      }
                      startIcon={expanded ? <NorthIcon /> : <SouthIcon />}
                    >
                      {t(expanded ? 'ShowLess' : 'ShowMore', {
                        slots: weekSlots[day].length - WEEK_SLOTS_LIMIT,
                      })}
                    </Button>
                  ) : null}

                  {!weekSlots[day].length ? renderInfo() : null}
                </div>
              );
            })}
          </>
        </>
      ) : null}

      {period === 'month' ? (
        <>
          <div
            className={classNames({
              [classes.navigationWrapper]: true,
              [classes.scrollBarFixed]: fixedDaysNavigation,
            })}
          >
            <ScrollBarWrapper>
              {Object.keys(groupScheduleWeeksByMonth).map((month) => (
                <div
                  key={generateUUID()}
                  className={classNames({
                    [classes.dayItem]: true,
                    [classes.active]: activeMonth === month,
                  })}
                  onClick={() =>
                    generateScheduleWeeksByMonth(
                      groupScheduleWeeksByMonth[month],
                      month,
                    )
                  }
                >
                  <div className={classes.headline}>{month}</div>
                </div>
              ))}
            </ScrollBarWrapper>

            <div
              className={classNames({
                [classes.daysNavigation]: true,
                [classes.fixedDaysNavigation]: fixedDaysNavigation,
              })}
            >
              {renderIncrement(decrementMonth)}
              {renderDecrement(incrementMonth)}
            </div>
          </div>
          <>
            <div
              className={classNames({
                [classes.activeHeadline]: true,
                [classes.marginSm]: true,
              })}
            >
              <div>{activeMonth}</div>
              {renderClearData()}
            </div>

            {Object.keys(monthSlots).map((week) => (
              <div
                key={generateUUID()}
                className={classes.weekWrapper}
                onClick={() => {
                  handleChangePeriod('week');
                  generateScheduleDaysByWeek(
                    groupScheduleDaysByWeek[week],
                    week,
                  );
                }}
              >
                <div>
                  <div
                    className={classNames({
                      [classes.weekName]: true,
                      [classes.noMargin]: !(monthIsFuture || monthIsCurrent),
                    })}
                  >
                    {week}
                  </div>
                  {!(monthIsFuture || monthIsCurrent) ? null : (
                    <div className={classes.freeSlots}>
                      {slotsText
                        ? monthSlots[week]?.count + ' ' + slotsText
                        : t('FreeSlots', { count: monthSlots[week]?.count })}
                    </div>
                  )}
                </div>
                {/* `hoverOff` is never defined in `useStyles` (only `hoverOn` is) —
                    preserved as-is, same pre-existing dead-className pattern as `attentionText` above. */}
                <ChevronRight2 className={(classes as Record<string, string>).hoverOff} />
                <ChevronRight2w className={classes.hoverOn} />
              </div>
            ))}
          </>
        </>
      ) : null}
    </>
  );
};

export default RenderSchedule;
