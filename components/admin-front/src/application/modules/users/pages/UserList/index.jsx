import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import cleenDeep from 'clean-deep';
import withStyles from '@mui/styles/withStyles';
import { Button, Dialog, DialogContent, DialogActions, DialogTitle, Checkbox } from '@mui/material';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { makeStyles } from '@mui/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import endPoint from 'application/endPoints/users';
import asModulePage from 'hooks/asModulePage';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import urlHashParams from 'helpers/urlHashParams';
import DataTable from 'components/DataTable';
import ProgressLine from 'components/Preloader/ProgressLine';
import Message from 'components/Snackbars/Message';
import StringElement from 'components/JsonSchema/elements/StringElement';
import dataTableSettings from 'modules/users/pages/UserList/variables/dataTableSettings';
import checkAccess from 'helpers/checkAccess';
import { createUser } from 'actions/auth';
import { addMessage } from 'actions/error';
import { getConfig } from 'core/helpers/configLoader';

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover
    }
  }
}))(Button);

const withStylesCss = makeStyles((theme) => ({
  checkbox: {
    '& svg': {
      fill: theme.palette.primary.main
    }
  },
  checkboxRoot: {
    position: 'relative'
  }
}));

const UserListPage = (props) => {
  const config = getConfig();

  const { t, title, userActions, actions, loading, location, history, userUnits, userInfo } = props;

  const classes = withStylesCss();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [middleName, setMiddleName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState([]);
  const [serviceError, setServiceError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [needOnboarding, setNeedOnboarding] = React.useState(false);
  const [onboardingTaskId, setOnboardingTaskId] = React.useState(null);

  const hasAccess = checkAccess(
    {
      unitHasAccessTo: 'navigation.users.editable'
    },
    userInfo || {},
    userUnits || {}
  );

  const settings = dataTableSettings({
    t,
    actions,
    darkTheme: true,
    readOnly: !hasAccess
  });

  const tableProps = {
    ..._.merge(settings, dataTableAdapter(props, endPoint))
  };

  const toggleShowPassword = React.useCallback(
    () => setShowPassword(!showPassword),
    [showPassword, setShowPassword]
  );

  const handleCloseDialog = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenDialog = React.useCallback(() => {
    setOpen(true);
  }, []);

  const handleCreateUser = React.useCallback(async () => {
    if (pending) return;

    setErrors([]);

    const newErrors = [];

    if (!email?.length) {
      newErrors.push('email');
    }

    if (!password?.length) {
      newErrors.push('password');
    }

    if (!firstName?.length) {
      newErrors.push('firstName');
    }

    if (!lastName?.length) {
      newErrors.push('lastName');
    }

    setErrors(newErrors);

    if (newErrors.length) return;

    setPending(true);

    try {
      await userActions.createUser(
        cleenDeep({
          email,
          password,
          firstName,
          middleName,
          lastName,
          needOnboarding,
          onboardingTaskId
        })
      );

      userActions.addMessage(new Message('UserCreated', 'success'));

      setPending(false);

      setOpen(false);

      actions.load();
    } catch (error) {
      setServiceError(error?.message);
      setPending(false);
    }
  }, [
    userActions,
    actions,
    pending,
    email,
    password,
    firstName,
    middleName,
    lastName,
    needOnboarding,
    onboardingTaskId
  ]);

  React.useEffect(() => {
    const filters = urlHashParams();
    Object.values(filters).length ? actions.onFilterChange(filters) : actions.load();
  }, [actions, history]);

  React.useEffect(() => {
    const filters = urlHashParams();
    if (Object.values(filters).length) {
      actions.onFilterChange(filters);
    }
  });

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
      <DataTable
        CustomToolbar={() => {
          return (
            <>
              {config?.passwordAuth ? (
                <ColorButton
                  variant="contained"
                  color="primary"
                  disableElevation={true}
                  onClick={handleOpenDialog}
                  actions={tableProps.actions}
                >
                  {t('AddUser')}
                </ColorButton>
              ) : null}
            </>
          );
        }}
        {...tableProps}
      />

      <Dialog
        open={open}
        fullWidth={true}
        maxWidth="sm"
        scroll={'body'}
        onClose={handleCloseDialog}
      >
        <DialogTitle>{t('CreatingUser')}</DialogTitle>
        <DialogContent>
          <StringElement
            description={t('Email')}
            required={true}
            fullWidth={true}
            darkTheme={true}
            variant={'outlined'}
            value={email}
            onChange={setEmail}
            error={
              errors.includes('email')
                ? { message: t('RequiredField') }
                : serviceError.includes('Invalid value') || serviceError.includes('email')
                ? { message: t(serviceError) }
                : null
            }
          />

          <StringElement
            description={t('Password')}
            required={true}
            fullWidth={true}
            onChange={setPassword}
            value={password}
            darkTheme={true}
            variant={'outlined'}
            error={
              errors.includes('password')
                ? { message: t('RequiredField') }
                : serviceError.includes('Password')
                ? { message: t(serviceError) }
                : null
            }
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleShowPassword}>
                    {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <StringElement
            description={t('LastName')}
            required={true}
            fullWidth={true}
            darkTheme={true}
            variant={'outlined'}
            value={lastName}
            onChange={setLastName}
            error={errors.includes('lastName') ? { message: t('RequiredField') } : null}
          />

          <StringElement
            description={t('FirstName')}
            required={true}
            fullWidth={true}
            darkTheme={true}
            variant={'outlined'}
            value={firstName}
            onChange={setFirstName}
            error={errors.includes('firstName') ? { message: t('RequiredField') } : null}
          />

          <StringElement
            description={t('MiddleName')}
            required={true}
            fullWidth={true}
            darkTheme={true}
            variant={'outlined'}
            value={middleName}
            onChange={setMiddleName}
            error={errors.includes('middleName') ? { message: t('RequiredField') } : null}
          />

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  classes={{
                    checked: classes.checkbox,
                    root: classes.checkboxRoot
                  }}
                  checked={needOnboarding}
                  onChange={() => setNeedOnboarding(!needOnboarding)}
                />
              }
              label={t('NeedOnboarding')}
            />
          </FormGroup>

          {needOnboarding ? (
            <StringElement
              description={t('OnboardingTaskId')}
              required={true}
              fullWidth={true}
              darkTheme={true}
              variant={'outlined'}
              value={onboardingTaskId}
              onChange={setOnboardingTaskId}
              error={errors.includes('onboardingTaskId') ? { message: t('RequiredField') } : null}
            />
          ) : null}

          <ProgressLine loading={pending} />
        </DialogContent>

        <DialogActions>
          <Button autoFocus={true} onClick={() => setOpen(false)} color="primary">
            {t('Cancel')}
          </Button>
          <Button onClick={handleCreateUser} color="primary">
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </LeftSidebarLayout>
  );
};

const mapStateToProps = ({ auth: { userUnits, info: userInfo } }) => ({
  userUnits,
  userInfo
});

const mapDispatchToProps = (dispatch) => ({
  userActions: {
    createUser: bindActionCreators(createUser, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const translated = translate('UserListPage')(UserListPage);
const module = asModulePage(translated);
const connected = connect(mapStateToProps, mapDispatchToProps)(module);
export default dataTableConnect(endPoint)(connected);
