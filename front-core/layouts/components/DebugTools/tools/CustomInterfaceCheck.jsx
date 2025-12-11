import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Editor from 'components/Editor';
import SplitPane from 'react-split-pane';
import {
  Dialog,
  Toolbar,
  IconButton,
  MenuItem,
  Select,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import evaluate from 'helpers/evaluate';
import { setCheckHiddenFunc } from 'actions/debugTools';
import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';

const styles = {
  root: {
    display: 'flex',
    height: '100%',
    '& > div': {
      flex: '.5',
    },
  },
  rightContainer: {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    paddingLeft: 2,
  },
  funcContainer: {
    flex: 1,
    paddingLeft: 16,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    minHeight: 40,
  },
  select: {
    padding: 0,
  },
  formControl: {
    padding: 7,
    paddingLeft: 0,
    marginTop: 9,
  },
  funcContainerTitle: {
    marginBottom: 10,
    marginTop: 10,
  },
};

const CheckHiddenFunction = ({ t, classes, customInterface }) => {
  const [controls, setControls] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [element, setElement] = React.useState(null);
  const [func, setFunc] = React.useState(false);

  React.useEffect(() => {
    const getControls = () => {
      const controlsArray = [];

      if (!customInterface) return;

      propertiesEach(
        customInterface.schema,
        customInterface.data,
        (schema, data, path, parentSchema, parentData, key) => {
          if (!key) return;

          if (schema.hidden) {
            controlsArray.push({
              schema,
              data,
              path,
              parentSchema,
              parentData,
              funcType: 'hidden',
              key: `${key} - hidden`,
            });
          }
          if (schema.checkRequired) {
            controlsArray.push({
              schema,
              data,
              path,
              parentSchema,
              parentData,
              funcType: 'checkRequired',
              key: `${key} - checkRequired`,
            });
          }
        },
      );

      setControls(controlsArray);
    };

    getControls();
  }, [customInterface]);

  if (!customInterface) return null;

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  const handleSelectControl = ({ target: { value } }) => {
    const chosenControl = controls.find(({ key }) => key === value);

    setElement(chosenControl);

    if (chosenControl.funcType === 'hidden') {
      setFunc(chosenControl.schema.hidden + '');
    } else {
      setFunc(chosenControl.schema.checkRequired);
    }
  };

  const handleCheckFunc = () => {
    if (!func) return '';

    let result = '';

    switch (element?.funcType) {
      case 'hidden': {
        result = evaluate(
          func,
          customInterface?.data,
          element?.data,
          element?.parentValue,
        );
        break;
      }
      case 'checkRequired': {
        result = evaluate(
          func,
          element?.data,
          customInterface?.data,
          customInterface?.data,
          element?.parentValue,
        );
        break;
      }
      default: {
        result = evaluate(func, customInterface?.data);
        break;
      }
    }

    if (result instanceof Error) {
      return result.message;
    }

    return result;
  };

  const renderControls = () => {
    if (!controls.length) return null;

    return (
      <FormControl fullWidth={true} className={classes.formControl}>
        <InputLabel>{t('SelectElement')}</InputLabel>
        <Select
          variant="outlined"
          value={element?.key || ''}
          onChange={handleSelectControl}
          classes={{
            select: classes.select,
          }}
        >
          {controls.map((item) => (
            <MenuItem key={item.key} value={item.key}>
              {[item.key, item.schema.description].filter(Boolean).join(' - ')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  return (
    <div className={classes.root}>
      <SplitPane split="vertical" minSize="50%">
        <Editor
          language="json"
          value={JSON.stringify(customInterface?.schema, null, 4)}
          readOnly={true}
          width="100%"
          height="100%"
        />
        <div className={classes.rightContainer}>
          <div className={classes.funcContainer}>
            {renderControls()}

            <Typography variant="body1">
              {t('Function')}

              <IconButton onClick={openModal}>
                <FullscreenIcon />
              </IconButton>
            </Typography>
            <Editor
              language="javascript"
              value={func || ''}
              width="100%"
              height="calc(100% - 48px)"
              onChange={setFunc}
            />
          </div>
          <div className={classes.funcContainer}>
            <Typography variant="body1" className={classes.funcContainerTitle}>
              {t('Result')}
            </Typography>
            <Editor
              language="json"
              value={JSON.stringify(handleCheckFunc(), null, 4)}
              readOnly={true}
              width="100%"
              height="calc(100% - 48px)"
            />
          </div>
        </div>
      </SplitPane>
      <Dialog open={open} fullScreen={true} fullWidth={true}>
        <Toolbar className={classes.toolbar}>
          <IconButton onClick={closeModal}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Editor
          language="javascript"
          value={func || ''}
          onChange={setFunc}
          width="100%"
          height="calc(100% - 48px)"
        />
      </Dialog>
    </div>
  );
};

const mapStateToProps = ({
  debugTools: { checkHiddenFuncs, customInterface },
}) => ({
  checkHiddenFuncs,
  customInterface,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    setCheckHiddenFunc: bindActionCreators(setCheckHiddenFunc, dispatch),
  },
});

const styled = withStyles(styles)(CheckHiddenFunction);
const translated = translate('DebugTools')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
