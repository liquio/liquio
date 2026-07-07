import theme from '../../core/theme';
import { getConfig } from 'helpers/configLoader';
import _ from 'lodash/fp';

const currentTheme = {
  logoStyles: {
    width: 48
  }
};

let configTheme = {};

try {
  configTheme = getConfig()?.theme || {};
} catch (error) {
  configTheme = {};
}

const mergeTheme = _.merge(_.merge(theme, currentTheme), configTheme);

export default mergeTheme;
