import React, { Component, Fragment } from 'react';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';

import setComponentsId from 'helpers/setComponentsId';
import { dateToMoment, filterMinDate, filterMaxDate } from 'helpers/humanDateFormat';
import CustomDatePickerRaw from './CustomDatePicker';

const CustomDatePicker = CustomDatePickerRaw as unknown as React.ComponentType<Record<string, unknown>>;

const style = {};

interface DateRangePickerProps {
  setId?: (elementName: string) => string;
  t: (key: string, params?: Record<string, unknown>) => string;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
}

interface DateRangePickerState {
  fromDate: string;
  toDate: string;
  correctDate: string;
}

class DateRangePicker extends Component<DateRangePickerProps, DateRangePickerState> {
  static defaultProps: Partial<DateRangePickerProps> = {
    setId: undefined,
    value: '',
    onChange: undefined
  };

  state: DateRangePickerState = { fromDate: '', toDate: '', correctDate: '' };

  onChange = (property: 'fromDate' | 'toDate') => (date: string) => {
    const { onChange } = this.props;
    this.setState({ [property]: date, correctDate: '' } as unknown as DateRangePickerState, () => {
      const { fromDate, toDate } = this.state;
      const value = [fromDate || filterMinDate, toDate || filterMaxDate].join(',');
      onChange!({ target: { value } });
    });
  };

  setOneDate = (date: string) => {
    const { onChange } = this.props;
    const value = `${date},${date}`;
    this.setState({ correctDate: date, fromDate: date, toDate: date }, () =>
      onChange!({ target: { value } })
    );
  };

  componentWillReceiveProps(nextProps: DateRangePickerProps) {
    const { value } = nextProps;
    const parts = (value as string).split(',');
    const correctDate = parts[0] && parts[0] === parts[1] ? parts[0] : '';
    this.setState({
      fromDate: parts[0] && parts[0] !== filterMinDate ? parts[0] : '',
      toDate: parts[1] && parts[1] !== filterMaxDate ? parts[1] : '',
      correctDate
    });
  }

  render() {
    const { t } = this.props;
    const { fromDate, toDate, correctDate } = this.state;
    const setId = this.props.setId || setComponentsId('date-picker-range');
    const formatingFromDate = fromDate ? dateToMoment(fromDate) : '';
    const formatingToDate = toDate ? dateToMoment(toDate) : '';
    const formatingCorrectDate = correctDate ? dateToMoment(correctDate) : '';

    return (
      <Fragment>
        <div id={setId('wrap')}>
          <CustomDatePicker
            setId={(elementName: string) => setId(`from-date-${elementName}`)}
            onChange={this.onChange('fromDate')}
            date={formatingFromDate}
            label={t('FromDate')}
            maxDate={toDate}
            required={false}
          />
          <CustomDatePicker
            setId={(elementName: string) => setId(`to-date-${elementName}`)}
            onChange={this.onChange('toDate')}
            date={formatingToDate}
            label={t('ToDate')}
            minDate={fromDate}
            required={false}
          />
        </div>
        <div id={setId('correct-date-wrap')}>
          <CustomDatePicker
            setId={(elementName: string) => setId(`correct-date-${elementName}`)}
            onChange={this.setOneDate}
            date={formatingCorrectDate}
            label={t('CorrectDate')}
            required={false}
          />
        </div>
      </Fragment>
    );
  }
}

const styled = withStyles(style)(DateRangePicker as never);
const translated = translate('DatePicker')(styled as never);
export default translated as unknown as React.ComponentType<Record<string, unknown>>;
