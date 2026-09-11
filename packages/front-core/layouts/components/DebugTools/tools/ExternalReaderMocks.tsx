import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { getMocksKeysByUser } from 'actions/debugTools';
import storage from 'helpers/storage';
import StringElement from 'components/JsonSchema/elements/StringElement';

const styles = {
  root: {
    padding: 20,
  },
};

interface ExternalReaderMocksProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  actions: { getMocksKeysByUser: (options: string) => Promise<unknown> };
  template?: { jsonSchema?: { properties?: Record<string, unknown> } };
}

const ExternalReaderMocks = ({ t, classes, actions, template }: ExternalReaderMocksProps) => {
  const [readers, setReaders] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState<boolean | null>(null);
  const [selectedReaders, setSelectedReaders] = React.useState<string[]>(() => {
    const enabledMocks = storage.getItem('enabled_mocks');
    return enabledMocks ? enabledMocks.split(',') : [];
  });

  React.useEffect(() => {
    const getReaders = async () => {
      const fieldsArray: string[] = [];
      let options = '';
      const schema = template?.jsonSchema?.properties;
      const findParentWithControl = (obj: Record<string, unknown> | null | undefined): unknown => {
        if (!obj || typeof obj !== 'object') {
          return null;
        }

        if (obj.method && obj.service) {
          fieldsArray.push(`${obj.service}.${obj.method}`);
        } else if (
          typeof obj?.control === 'string' &&
          (obj?.control as string)?.includes('bank.questionnaire')
        ) {
          fieldsArray.push('bank.init');
        } else if (obj?.value && (obj?.value as string)?.includes('external-reader.')) {
          fieldsArray.push((obj.value as string).replace('external-reader.', ''));
        }

        for (const key in obj) {
          const result = findParentWithControl(obj[key] as Record<string, unknown>);
          if (result) {
            return result;
          }
        }

        return null;
      };

      if (schema) {
        findParentWithControl(schema);

        const queryString = fieldsArray.join('&readers=');
        options = `/?readers=${queryString}`;
      }

      const response = await actions.getMocksKeysByUser(options);

      if (response instanceof Error) {
        setError(true);
        return;
      }

      setReaders(response as string[]);
    };

    getReaders();
  }, [actions, template]);

  React.useEffect(() => {
    storage.setItem('enabled_mocks', selectedReaders as never);
  }, [selectedReaders]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>, reader: string) => {
    let newSelectedReaders = [...selectedReaders];

    const existingItem = newSelectedReaders.find((item) => {
      const provider = [item.split('.')[0], item.split('.')[1]].join('.');
      return reader.includes(provider);
    });

    if (event.target.checked) {
      newSelectedReaders = [...selectedReaders, reader];
    } else {
      newSelectedReaders = selectedReaders.filter((item) => item !== reader);
    }

    if (existingItem) {
      newSelectedReaders = newSelectedReaders.filter(
        (item) => item !== existingItem,
      );
    }

    setSelectedReaders(newSelectedReaders);
  };

  const filteredReaders = readers.filter((reader) => reader.includes(search));

  return (
    <div className={classes.root}>
      {error ? (
        <Typography>{t('MockInitError')}</Typography>
      ) : (
        <>
          <StringElement
            value={search}
            fullWidth={true}
            required={true}
            onChange={setSearch as never}
            placeholder={t('SearchMock')}
            variant="outlined"
          />

          <FormGroup>
            {filteredReaders.map((reader) => (
              <FormControlLabel
                key={reader}
                control={<Checkbox />}
                label={reader}
                checked={selectedReaders.includes(reader)}
                onChange={(event) => onChange(event as React.ChangeEvent<HTMLInputElement>, reader)}
              />
            ))}
          </FormGroup>
        </>
      )}
    </div>
  );
};

const mapStateToProps = ({
  debugTools: { checkHiddenFuncs, customInterface },
}: {
  debugTools: { checkHiddenFuncs: unknown; customInterface: unknown };
}) => ({
  checkHiddenFuncs,
  customInterface,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getMocksKeysByUser: bindActionCreators(getMocksKeysByUser, dispatch),
  },
});

const styled = withStyles(styles)(ExternalReaderMocks as never);
const translated = translate('DebugTools')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
