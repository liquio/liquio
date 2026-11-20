import { Theme } from '@mui/material/styles';

const styles = (theme: Theme) => ({
  root: {
    fontFamily: theme.typography.fontFamily,
  },
  radioMargin: {
    marginLeft: 30,
  },
  row: {
    '& label:first-child span': {
      marginLeft: 0,
    },
  },
  labelSize: {
    '& span': {
      fontSize: 16,
    },
  },
  distance: {
    marginTop: 10,
    maxWidth: 1000,
  },
});

export default styles;
