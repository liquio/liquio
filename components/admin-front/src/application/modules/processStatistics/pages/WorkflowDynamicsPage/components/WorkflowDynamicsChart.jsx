import React, { useEffect, useMemo } from 'react';
import moment from 'moment';
import { useDispatch } from 'react-redux';
import ReactResizeDetector from 'react-resize-detector';
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import queryString from 'query-string';
import Preloader from 'components/Preloader';
import * as api from 'services/api';
import randomColor from 'helpers/randomColor';
import { toUnderscoreObject } from 'helpers/toUnderscore';
import { timelineTimeFormat } from '../helpers/periodTimeFormat';
import Legend from './Legend';

const wrapperStyle = { pointerEvents: 'auto' };

const WorkflowDynamicsChart = ({
  timeStep,
  duringThisPeriod,
  untilThisMoment,
  type,
}) => {
  const dispatch = useDispatch();
  const [height, setHeigh] = React.useState();
  const [width, setWidth] = React.useState();
  const containerRef = React.useRef();

  const [chartData, setChartData] = React.useState(null);
  const [chartLines, setChartLines] = React.useState([]);
  const [selected, onChipSelect] = React.useState([]);

  const datePeriods = {
    '1 day': 'day',
    '1 month': 'month',
    '1 year': 'year',
  };

  const untileDate = useMemo(() => {
    if (untilThisMoment === 'NOW()') {
      return untilThisMoment;
    }

    if (!datePeriods[duringThisPeriod]) {
      throw new Error('Invalid date period');
    }

    return moment(untilThisMoment)
      .add(1, datePeriods[duringThisPeriod])
      .startOf(datePeriods[duringThisPeriod])
      .format('YYYY-MM-DD HH:mm:ss.SSS');
  }, [datePeriods, duringThisPeriod, untilThisMoment]);

  const onResize = React.useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    setHeigh(containerRef.current.clientHeight - 50);
    setWidth(containerRef.current.clientWidth);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setChartData(null);
      const data = await api.get(
        `sql-reports/processDynamic?${queryString.stringify(
          toUnderscoreObject({
            timeStep,
            duringThisPeriod,
            untilThisMoment: untileDate,
          }),
        )}`,
        'PROCESS_DYNAMIC_REPORT_FETCH',
        dispatch,
      );

      const names = data
        .map(({ name }) => name)
        .filter((name, index, arr) => arr.indexOf(name) === index);

      const times = data
        .map(({ time_step }) => time_step)
        .filter((time, index, arr) => arr.indexOf(time) === index);

      const timeData = times
        .map((time) => {
          const records = data.filter(({ time_step }) => time_step === time);

          const timeRecord = records.reduce(
            (acc, { name, [type]: count }) => {
              acc[name] = count;
              return acc;
            },
            { time },
          );

          return timeRecord;
        })
        .sort((a, b) => moment(a.time).diff(moment(b.time)))
        .map(({ time, ...record }) => ({
          ...record,
          time: timelineTimeFormat(time, duringThisPeriod),
        }));

      setChartData(timeData);

      setChartLines(
        names.map((name) => ({
          name,
          id: name,
          color: randomColor(),
        })),
      );

      onChipSelect(names);
    };

    fetchData();
  }, [timeStep, duringThisPeriod, untileDate, dispatch, type]);

  const filterEmptyChartData = useMemo(
    () =>
      chartData &&
      chartData.map((obj) =>
        Object.fromEntries(
          Object.entries(obj).filter(
            ([key]) => isNaN(obj[key]) || Number(obj[key]),
          ),
        ),
      ),
    [chartData],
  );

  const filteredChartsLines = useMemo(
    () => chartLines.filter(({ name }) => selected.includes(name)),
    [chartLines, selected],
  );

  return chartData ? (
    <>
      <Legend
        selected={selected}
        chartLines={chartLines}
        chartData={filterEmptyChartData}
        onChipSelect={onChipSelect}
      />
      <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
        <LineChart width={width} height={height} data={filterEmptyChartData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="time" />

          <YAxis />

          <Tooltip wrapperStyle={wrapperStyle} />

          {filteredChartsLines.map(({ name, color }) => (
            <Line
              key={name}
              dataKey={name}
              stroke={color}
              strokeWidth={2}
              connectNulls={true}
              isAnimationActive={false}
            />
          ))}
        </LineChart>

        <ReactResizeDetector handleHeight={true} onResize={onResize} />
      </div>
    </>
  ) : (
    <Preloader flex={true} />
  );
};

export default WorkflowDynamicsChart;
