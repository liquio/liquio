import { makeStyles } from '@mui/styles';
import { useSchema } from './hooks/useSchema';

import { PageList } from './components/PageList';
import { PageControls } from './components/PageControls';
import classNames from 'classnames';

const useStyles = makeStyles({
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
  },
  mainPanel: {
    flex: 1,
    position: 'relative',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
  },
  overflowHidden: {
    overflow: 'hidden',
  },
});


export const VisualEditor = ({
  value = '',
  onChange = () => { },
}) => {
  const {
    schema,
    handleChange: setSchema,
    currentPage,
    setCurrentPage,
    currentPageSchema,
    handleChangePageSchema,
  } = useSchema(value, onChange);

  const classes = useStyles();
  return (
    <div className={classNames(classes.mainPanel, classes.overflowHidden)}>
      <PageList
        schema={schema}
        onChange={setSchema}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      <PageControls
        schema={currentPageSchema}
        onChange={handleChangePageSchema}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        fullSchema={schema}
        setSchema={setSchema}
      />
    </div>
  );
}

VisualEditor.Settings = () => {
  return null; // No specific settings for VisualEditor
}
