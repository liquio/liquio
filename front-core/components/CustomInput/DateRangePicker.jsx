import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';

import setComponentsId from 'helpers/setComponentsId';
import { dateToMoment, filterMinDate, filterMaxDate } from 'helpers/humanDateFormat';
import CustomDatePicker from './CustomDatePicker';

const style = {};

class DateRangePicker extends Component {
  state = { fromDate: '', toDate: '', correctDate: '' };

  onChange = (property) => (date) => {
    const { onChange } = this.props;
    this.setState({ [property]: date, correctDate: '' }, () => {
      const { fromDate, toDate } = this.state;
      const value = [fromDate || filterMinDate, toDate || filterMaxDate].join(',');
      onChange({ target: { value } });
    });
  };

  setOneDate = (date) => {
    const { onChange } = this.props;
    const value = `${date},${date}`;
    this.setState({ correctDate: date, fromDate: date, toDate: date }, () =>
      onChange({ target: { value } })
    );
  };

  componentWillReceiveProps(nextProps) {
    const { value } = nextProps;
    const parts = value.split(',');
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
            setId={(elementName) => setId(`from-date-${elementName}`)}
            onChange={this.onChange('fromDate')}
            date={formatingFromDate}
            label={t('FromDate')}
            maxDate={toDate}
            required={false}
          />
          <CustomDatePicker
            setId={(elementName) => setId(`to-date-${elementName}`)}
            onChange={this.onChange('toDate')}
            date={formatingToDate}
            label={t('ToDate')}
            minDate={fromDate}
            required={false}
          />
        </div>
        <div id={setId('correct-date-wrap')}>
          <CustomDatePicker
            setId={(elementName) => setId(`correct-date-${elementName}`)}
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

DateRangePicker.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func
};

DateRangePicker.defaultProps = {
  setId: undefined,
  value: '',
  onChange: undefined
};

const styled = withStyles(style)(DateRangePicker);
const translated = translate('DatePicker')(styled);
export default translated;
