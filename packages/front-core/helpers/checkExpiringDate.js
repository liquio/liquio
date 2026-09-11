import { getConfig } from './configLoader';
import moment from 'moment';

const checkExpiringDate = (certificate) => {
  const config = getConfig();
  const certificateExpWarning = config.certificateExpWarning;
  
  if (!certificateExpWarning || !certificate) return false;

  try {
    const { certBeginTime } = certificate;

    const expiringDates = localStorage.getItem('checkExpiringDate') || [];

    if (expiringDates.includes(new Date(certBeginTime).getTime())) return false;

    const {
      privKeyEndTime: privKeyEndTimeOrigin,
      certEndTime: certEndTimeOrigin,
    } = certificate;

    const currentTime = moment();
    const privKeyEndTime = moment(privKeyEndTimeOrigin);
    const certEndTime = moment(certEndTimeOrigin);

    const diffkey = privKeyEndTime.diff(currentTime, 'days');
    const diffCert = certEndTime.diff(currentTime, 'days');

    if (certificateExpWarning >= diffkey) return diffkey + '';
    if (certificateExpWarning >= diffCert) return diffCert + '';

    return false;
  } catch {
    return false;
  }
};

export default checkExpiringDate;
