import theme from 'core/theme';
import _ from 'lodash/fp';

const currentTheme = {
  logoStyles: {
    width: 48
  }
};

const mergeTheme = _.merge(theme, currentTheme);

export default mergeTheme;
