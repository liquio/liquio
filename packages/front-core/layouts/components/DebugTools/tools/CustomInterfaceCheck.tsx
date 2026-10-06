import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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
import { JsonSchemaNode } from 'components/JsonSchema/types';

const SplitPaneAny = SplitPane as unknown as React.ComponentType<Record<string, unknown>>;

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
    flexDirection: 'column' as const,
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

interface Control {
  schema: JsonSchemaNode & { hidden?: unknown; checkRequired?: unknown; description?: string };
  data: unknown;
  path: string;
  parentSchema: JsonSchemaNode;
  parentData: unknown;
  funcType: 'hidden' | 'checkRequired';
  key: string;
  parentValue?: unknown;
}

interface CustomInterface {
  schema?: JsonSchemaNode;
  data?: unknown;
}

interface CheckHiddenFunctionProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  customInterface?: CustomInterface | null;
}

const CheckHiddenFunction = ({ t, classes, customInterface }: CheckHiddenFunctionProps) => {
  const [controls, setControls] = React.useState<Control[]>([]);
  const [open, setOpen] = React.useState(false);
  const [element, setElement] = React.useState<Control | null>(null);
  const [func, setFunc] = React.useState<string | boolean>(false);

  React.useEffect(() => {
    const getControls = () => {
      const controlsArray: Control[] = [];

      if (!customInterface) return;

      propertiesEach(
        customInterface.schema as JsonSchemaNode,
        customInterface.data,
        (schema, data, path, parentSchema, parentData, key) => {
          if (!key) return;

          const schemaWithFlags = schema as JsonSchemaNode & { hidden?: unknown; checkRequired?: unknown };

          if (schemaWithFlags.hidden) {
            controlsArray.push({
              schema: schemaWithFlags,
              data,
              path,
              parentSchema,
              parentData,
              funcType: 'hidden',
              key: `${key} - hidden`,
            });
          }
          if (schemaWithFlags.checkRequired) {
            controlsArray.push({
              schema: schemaWithFlags,
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

  const handleSelectControl = ({ target: { value } }: { target: { value: string } }) => {
    const chosenControl = controls.find(({ key }) => key === value) as Control;

    setElement(chosenControl);

    if (chosenControl.funcType === 'hidden') {
      setFunc(chosenControl.schema.hidden + '');
    } else {
      setFunc(chosenControl.schema.checkRequired as string | boolean);
    }
  };

  const handleCheckFunc = () => {
    if (!func) return '';

    let result: unknown = '';

    switch (element?.funcType) {
      case 'hidden': {
        result = evaluate(
          func as string,
          customInterface?.data,
          element?.data,
          element?.parentValue,
        );
        break;
      }
      case 'checkRequired': {
        result = evaluate(
          func as string,
          element?.data,
          customInterface?.data,
          customInterface?.data,
          element?.parentValue,
        );
        break;
      }
      default: {
        result = evaluate(func as string, customInterface?.data);
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
          onChange={handleSelectControl as never}
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
      <SplitPaneAny split="vertical" minSize="50%">
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
              value={(func || '') as string}
              width="100%"
              height="calc(100% - 48px)"
              onChange={setFunc as unknown as (value: string | undefined) => void}
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
      </SplitPaneAny>
      <Dialog open={open} fullScreen={true} fullWidth={true}>
        <Toolbar className={classes.toolbar}>
          <IconButton onClick={closeModal}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Editor
          language="javascript"
          value={(func || '') as string}
          onChange={setFunc as unknown as (value: string | undefined) => void}
          width="100%"
          height="calc(100% - 48px)"
        />
      </Dialog>
    </div>
  );
};

const mapStateToProps = ({
  debugTools: { checkHiddenFuncs, customInterface },
}: {
  debugTools: { checkHiddenFuncs: unknown; customInterface: CustomInterface | null };
}) => ({
  checkHiddenFuncs,
  customInterface,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    setCheckHiddenFunc: bindActionCreators(setCheckHiddenFunc, dispatch),
  },
});

const styled = withStyles(styles)(CheckHiddenFunction as never);
const translated = translate('DebugTools')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
