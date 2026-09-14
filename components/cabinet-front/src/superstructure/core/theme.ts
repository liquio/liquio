/* eslint-disable @typescript-eslint/no-explicit-any */
import theme from '../../../node_modules/core/theme';
import { getConfig } from 'helpers/configLoader';
import _ from 'lodash/fp';

const currentTheme = {
  logoStyles: {
    width: 48
  }
};

let configTheme: any = {};

try {
  configTheme = getConfig()?.theme || {};
} catch {
  configTheme = {};
}

const mergeTheme = _.merge(_.merge(theme, currentTheme), configTheme);

export default mergeTheme;
