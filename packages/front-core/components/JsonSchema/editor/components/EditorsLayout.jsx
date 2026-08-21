import { makeStyles } from '@mui/styles';
import SnippetList from 'components/JsonSchema/editor/components/SnippetList';

const useStyles = makeStyles({
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'row'
  },
  sidePanel: {
    height: '100%',
    display: 'flex',
    transition: 'width 0.3s ease'
  }
});

export const EditorsLayout = ({ children }) => {
  const classes = useStyles();

  return (
    <div className={classes.wrapper}>
      <div className={classes.sidePanel}>
        <SnippetList />
      </div>
      {children}
    </div>
  );
};
