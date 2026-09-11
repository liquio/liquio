import React from 'react';
import { FormControl, TextField, Snackbar, Button } from '@mui/material';
import CustomDatePicker from 'components/CustomInput/CustomDatePicker';
import getFields from 'modules/profile/pages/UserProfile/components/fields';
import { getQueryLangParam } from 'actions/auth';
import { getConfig } from 'core/helpers/configLoader';
import PhoneInput from './PhoneInput';
import EmailInput from './EmailInput';

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
  showNotification,
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

ProfileLayout.defaultProps = {
  showNotification: false,
};

export default ProfileLayout;
