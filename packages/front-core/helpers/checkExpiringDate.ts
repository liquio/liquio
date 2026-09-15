import moment from 'moment';
import { getConfig } from './configLoader';

interface Certificate {
  certBeginTime?: string | number | Date;
  privKeyEndTime?: string | number | Date;
  certEndTime?: string | number | Date;
}

const checkExpiringDate = (certificate: Certificate | null | undefined): string | false => {
  const config = getConfig();
  const certificateExpWarning = config.certificateExpWarning as number | undefined;

  if (!certificateExpWarning || !certificate) return false;

  try {
    const { certBeginTime } = certificate;

    const expiringDates = (localStorage.getItem('checkExpiringDate') as unknown as number[]) || [];

    if (expiringDates.includes(new Date(certBeginTime as string).getTime())) return false;

    const { privKeyEndTime: privKeyEndTimeOrigin, certEndTime: certEndTimeOrigin } = certificate;

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
