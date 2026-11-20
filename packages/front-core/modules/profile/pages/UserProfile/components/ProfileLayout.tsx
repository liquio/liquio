import React, { useState } from 'react';
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  Switch,
  TextField,
  Snackbar,
  Button,
} from '@mui/material';
import CustomDatePicker from 'components/CustomInput/CustomDatePicker';
import getFields from 'modules/profile/pages/UserProfile/components/fields';
import { getQueryLangParam } from 'actions/auth';
import { getConfig } from 'core/helpers/configLoader';
import PhoneInput from './PhoneInput';
import EmailInput from './EmailInput';
import TwoFactorModal from './TwoFactorModal';

const isUkrainianLanguage = () => {
  const config = getConfig();
  const language = (getQueryLangParam() || config?.defaultLanguage || 'en-GB') as string;

  return ['uk', 'uk-ua', 'ua'].includes(language.toLowerCase());
};

interface FieldDef {
  key: string;
  name?: string;
  Component?: React.ComponentType<Record<string, unknown>>;
  changed?: string;
  label?: string;
  placeholder?: string;
  maxDate?: string;
  disabled?: boolean;
  helperText?: string;
  maxLength?: number;
}

interface RenderControlOptions {
  t: (key: string) => string;
  classes: Record<string, string>;
  handleChangePhone: (phone: unknown) => void;
  handleChangeDate: (key: string) => (date: unknown) => void;
  handleChange: (event: { target: { name: string; value: unknown } }) => void;
  values: Record<string, unknown>;
  handleSave: () => void;
}

const RenderControl =
  ({
    t,
    classes,
    handleChangePhone,
    handleChangeDate,
    handleChange,
    values,
    handleSave,
  }: RenderControlOptions) =>
  ({
    key,
    name,
    Component,
    changed,
    label,
    placeholder,
    maxDate,
    disabled,
    helperText,
    maxLength,
  }: FieldDef) => {
    return (
      <FormControl
        variant="standard"
        fullWidth={true}
        className={classes.formControl}
        margin="dense"
        key={key}
      >
        {Component && changed !== 'date' ? (
          <Component
            value={values[key]}
            onChange={
              changed === 'phone' && !disabled
                ? handleChangePhone
                : handleChange
            }
            handleSave={handleSave}
          />
        ) : null}
        {changed === 'date' ? (
          <CustomDatePicker
            label={t(label as string)}
            margin="dense"
            incomingFormat="DD/MM/YYYY"
            onChange={
              changed === 'date' && !disabled
                ? handleChangeDate(key)
                : handleChange
            }
            date={values[key] || ''}
            minDate="01/01/1900"
            maxDate={maxDate}
          />
        ) : null}
        {!changed ? (
          <TextField
            variant="standard"
            disabled={disabled}
            InputLabelProps={placeholder ? { shrink: true } : {}}
            placeholder={placeholder ? t(placeholder) : ''}
            name={name || key}
            label={t(label as string)}
            value={values[key] || ''}
            onChange={disabled ? undefined : (handleChange as never)}
            margin="dense"
            inputProps={{ maxLength }}
            helperText={helperText ? t(helperText) : ''}
          />
        ) : null}
      </FormControl>
    );
  };

interface ProfileLayoutProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  values: Record<string, unknown> & { isLegal?: boolean };
  saving: boolean;
  auth?: { useTwoFactorAuth?: boolean; twoFactorType?: string | null };
  showNotification?: boolean;
  handleChange: (event: { target: { name: string; value: unknown } }) => void;
  handleChangePhone: (phone: unknown) => void;
  handleChangeDate: (key: string) => (date: unknown) => void;
  handleSave: () => void;
  checkboxChange: (event: { target: { checked: boolean; name: string } }) => void;
}

const ProfileLayout = ({
  t,
  classes,
  values,
  values: { isLegal },
  saving,
  auth,
  showNotification = false,
  handleChange,
  handleChangePhone,
  handleChangeDate,
  handleSave,
  checkboxChange,
}: ProfileLayoutProps) => {
  const fields = getFields({
    EmailInput: EmailInput as unknown as React.ComponentType<Record<string, unknown>>,
    PhoneInput: PhoneInput as unknown as React.ComponentType<Record<string, unknown>>,
    showMiddleName: isUkrainianLanguage(),
  });
  const inputs = isLegal ? fields.isLegal : fields.notIsLegal;
  const [twoFactorModalMode, setTwoFactorModalMode] = useState<'enable' | 'disable' | null>(null);
  const twoFactorEnabled = !!auth?.useTwoFactorAuth;
  const isTotp = auth?.twoFactorType === 'totp';
  // Phone 2FA needs a phone; TOTP is managed by its own endpoints.
  const showTwoFactor = isTotp || twoFactorEnabled || !!values.phone;
  return (
    <>
      {inputs.map(
        RenderControl({
          t,
          classes,
          handleChangePhone,
          handleChangeDate,
          handleChange,
          values,
          handleSave,
        }),
      )}
      {showTwoFactor ? (
        <FormControl variant="standard" fullWidth={true} className={classes.formControl} margin="dense">
          <FormControlLabel
            control={
              <Switch
                checked={twoFactorEnabled}
                disabled={isTotp}
                onChange={() => setTwoFactorModalMode(twoFactorEnabled ? 'disable' : 'enable')}
                color="primary"
              />
            }
            label={t(twoFactorEnabled ? 'TwoFactorAuthDisable' : 'TwoFactorAuthEnable')}
          />
          {isTotp ? <FormHelperText>{t('TwoFactorAuthTotpActive')}</FormHelperText> : null}
          <TwoFactorModal
            open={!!twoFactorModalMode}
            onClose={() => setTwoFactorModalMode(null)}
            phone={values.phone as string}
            mode={twoFactorModalMode || 'enable'}
          />
        </FormControl>
      ) : null}
      <Button
        variant="contained"
        color="primary"
        disabled={saving}
        onClick={handleSave}
        className={classes.button}
      >
        {t('SaveButton')}
      </Button>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={showNotification}
        message={<span>{t('ProfileSaved')}</span>}
      />
    </>
  );
};

export default ProfileLayout;
