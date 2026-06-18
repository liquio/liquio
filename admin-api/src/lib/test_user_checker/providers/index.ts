import { EdsIssuerCheckerProvider } from './eds';
import { GovidIssuerCheckerProvider } from './govid';
import { LocalIssuerCheckerProvider } from './local';

export default [
  new EdsIssuerCheckerProvider(),
  new GovidIssuerCheckerProvider(),
  new LocalIssuerCheckerProvider(),
];
