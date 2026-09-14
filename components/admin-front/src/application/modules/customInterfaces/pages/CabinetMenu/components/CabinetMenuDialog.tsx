import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
} from 'helpers/localization';
import * as api from 'services/api';
import {
  createCabinetMenuItem,
  sortCabinetMenuItems,
  updateCabinetMenuItem,
  type CabinetMenuItem,
} from '../helpers/actions';
import CabinetMenuTranslationsDialog from './CabinetMenuTranslationsDialog';
import IconSelect, { isSupportedIconName } from './IconSelect';

interface CustomInterfaceOption {
  id: string;
  name?: string;
  route?: string;
}

interface CabinetMenuForm {
  id: string | null;
  parentId: string;
  order: number;
  name: string;
  description: string;
  icon: string;
  route: string;
  customInterfaceId: string;
  type: string;
  enabled: boolean;
  translations: string;
  options: string;
  access: string;
}

const stringifyObject = (value: unknown): string => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '{}';
  }

  return JSON.stringify(value, null, 2);
};

const parseJsonObject = (value: string, label: string): Record<string, unknown> => {
  if (!value?.trim()) {
    return {};
  }

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(label);
  }

  return parsed;
};

const getLocalizedName = (value: { name?: string; translations?: Record<string, string> } | undefined, languageCode: string | null): string => {
  const translations = value?.translations;

  if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
    for (const candidate of getTranslationCandidates(languageCode)) {
      if (typeof translations[candidate] === 'string' && translations[candidate].trim()) {
        return translations[candidate];
      }
    }
  }

  return value?.name || '';
};

const updateCurrentLocaleTranslation = (
  translationsValue: string,
  languageCode: string | null,
  name: string,
  errorLabel: string
): Record<string, string> => {
  let translations: Record<string, string> = {};

  try {
    translations = parseJsonObject(translationsValue, errorLabel) as Record<string, string>;
  } catch {
    translations = {};
  }

  if (name.trim()) {
    translations[languageCode as string] = name.trim();
  } else {
    delete translations[languageCode as string];
  }

  return translations;
};

const SystemItemIcon = ({ title }: { title: string }) => (
  <Tooltip title={title}>
    <AdminPanelSettingsOutlinedIcon
      fontSize="small"
      sx={{ color: 'text.secondary', flexShrink: 0 }}
    />
  </Tooltip>
);

const isRouteType = (type: string) => type === 'link' || type === 'button';
const CUSTOM_INTERFACES_PAGE_SIZE = 100;

const getInitialState = (value: CabinetMenuItem | null | undefined, parentId: string | undefined, languageCode: string | null): CabinetMenuForm => ({
  id: value?.id || null,
  parentId: parentId !== undefined ? parentId : ((value?.parentId as string) || ''),
  order: (value?.order as number) ?? 0,
  name: getLocalizedName(value as { name?: string; translations?: Record<string, string> }, languageCode),
  description: (value?.description as string) || '',
  icon: (value?.icon as string) || '',
  route: (value?.options?.route as string) || (value?.options?.endpoint as string) || (value?.options?.path as string) || '',
  customInterfaceId: (value?.options?.customInterfaceId as string) || '',
  type: (value?.type as string) || 'customInterface',
  enabled: (value?.enabled as boolean) ?? true,
  translations: stringifyObject(value?.translations),
  options: stringifyObject(value?.options),
  access: stringifyObject(value?.access),
});

const getCustomInterfacesPageUrl = (page: number): string => (
  `custom-interfaces?page=${page}&count=${CUSTOM_INTERFACES_PAGE_SIZE}`
);

const normalizeCustomInterfacesResponse = (result: unknown): { data: CustomInterfaceOption[]; meta: Record<string, unknown> } => ({
  data: Array.isArray(result)
    ? result
    : Array.isArray((result as { data?: unknown })?.data)
      ? (result as { data: CustomInterfaceOption[] }).data
      : [],
  meta: (result as { meta?: Record<string, unknown> })?.meta || {},
});

const loadAllCustomInterfaces = async (dispatch: unknown): Promise<CustomInterfaceOption[]> => {
  const firstResult = await api.get(
    getCustomInterfacesPageUrl(1),
    'GET_CUSTOM_INTERFACES_FOR_MENU',
    dispatch as never,
  );
  const firstPage = normalizeCustomInterfacesResponse(firstResult);
  const lastPage = Number(firstPage.meta?.lastPage) || 1;

  if (lastPage <= 1) {
    return firstPage.data;
  }

  const restPages = await Promise.all(
    Array.from({ length: lastPage - 1 }, (item, index) => (
      api.get(
        getCustomInterfacesPageUrl(index + 2),
        'GET_CUSTOM_INTERFACES_FOR_MENU',
        dispatch as never,
      )
    )),
  );

  return restPages.reduce(
    (list: CustomInterfaceOption[], result) => list.concat(normalizeCustomInterfacesResponse(result).data),
    firstPage.data,
  );
};

interface CabinetMenuDialogProps {
  open: boolean;
  onClose?: () => void;
  onAction?: (action: { type: string; item: CabinetMenuItem; reorderedItems?: CabinetMenuItem[] }) => void;
  value?: CabinetMenuItem | null;
  items?: CabinetMenuItem[];
  parentId?: string;
}

const CabinetMenuDialog = ({
  open,
  onClose,
  onAction,
  value,
  items,
  parentId,
}: CabinetMenuDialogProps) => {
  const t = useTranslate('CabinetMenuPage');
  const dispatch = useDispatch();
  const currentLanguageCode = React.useMemo(() => getCurrentLanguageCode(), []);
  const [form, setForm] = React.useState<CabinetMenuForm>(getInitialState(value, parentId, currentLanguageCode));
  const [error, setError] = React.useState('');
  const [customInterfaceOptions, setCustomInterfaceOptions] = React.useState<CustomInterfaceOption[]>([]);
  const [customInterfacesLoading, setCustomInterfacesLoading] = React.useState(false);
  const [translationsOpen, setTranslationsOpen] = React.useState(false);
  const isEdit = Boolean(value?.id);
  const isSystem = Boolean(value?.options?.system);

  React.useEffect(() => {
    if (open) {
      setForm(getInitialState(value, parentId, currentLanguageCode));
      setError('');
    }
  }, [open, value, parentId, currentLanguageCode]);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isActive = true;

    const loadCustomInterfaces = async () => {
      setCustomInterfacesLoading(true);
      try {
        const nextOptions = await loadAllCustomInterfaces(dispatch);

        if (isActive) {
          setCustomInterfaceOptions(nextOptions);
        }
      } catch (loadError) {
        if (isActive) {
          setCustomInterfaceOptions([]);
        }
      } finally {
        if (isActive) {
          setCustomInterfacesLoading(false);
        }
      }
    };

    loadCustomInterfaces();

    return () => {
      isActive = false;
    };
  }, [dispatch, open]);

  const parentOptions = React.useMemo(() => {
    return (items || []).filter((item) => (
      item.id !== value?.id && !item.parentId
    ));
  }, [items, value?.id]);

  const selectedCustomInterface = React.useMemo(() => {
    if (!form.customInterfaceId) {
      return null;
    }

    return customInterfaceOptions.find((item) => item.id === form.customInterfaceId) || null;
  }, [customInterfaceOptions, form.customInterfaceId]);
  const isValid = isRouteType(form.type) || Boolean(form.customInterfaceId);

  const handleChange = (field: keyof CabinetMenuForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event?.target?.type === 'checkbox'
      ? event.target.checked
      : event?.target?.value;

    if (field === 'type') {
      setForm((prev) => ({
        ...prev,
        type: nextValue as string,
        route: isRouteType(nextValue as string) ? prev.route : '',
        customInterfaceId: nextValue === 'customInterface' ? prev.customInterfaceId : '',
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event?.target?.value || '';

    setForm((prev) => {
      const translations = updateCurrentLocaleTranslation(
        prev.translations,
        currentLanguageCode,
        nextValue,
        t('TranslationsJsonError'),
      );

      return {
        ...prev,
        name: nextValue,
        translations: stringifyObject(translations),
      };
    });
  };

  const handleSubmit = async () => {
    setError('');

    try {
      const options = parseJsonObject(form.options, t('OptionsJsonError'));
      parseJsonObject(form.translations, t('TranslationsJsonError'));
      const parsedAccess = parseJsonObject(form.access, t('AccessJsonError'));
      const type = isSystem ? ((value?.type as string) || form.type) : form.type.trim();
      const route = isSystem
        ? ((value?.options?.route as string) || (value?.options?.endpoint as string) || (value?.options?.path as string) || '')
        : form.route.trim();
      const customInterfaceId = isSystem
        ? ((value?.options?.customInterfaceId as string) || '')
        : form.customInterfaceId;
      const customInterface = customInterfaceOptions.find((item) => item.id === customInterfaceId) || null;

      const nextTranslations = updateCurrentLocaleTranslation(
        form.translations,
        currentLanguageCode,
        form.name,
        t('TranslationsJsonError'),
      );

      const payload: CabinetMenuItem & { options: Record<string, unknown> } = {
        ...(isEdit ? { id: value?.id } : {}),
        parentId: form.parentId || null,
        order: Number(form.order) || 0,
        name: (value?.name as string) || form.name.trim() || null,
        description: form.description.trim() || null,
        icon: isSupportedIconName(form.icon.trim()) ? form.icon.trim() : null,
        translations: nextTranslations,
        type,
        options: {
          ...options,
          ...(isRouteType(type)
            ? {
              route,
            }
            : {
              customInterfaceId: customInterfaceId || null,
              route: customInterface?.route || '',
            }),
        },
        access: isSystem ? (value?.access || {}) : parsedAccess,
        enabled: Boolean(form.enabled),
      } as unknown as CabinetMenuItem & { options: Record<string, unknown> };

      if (isRouteType(type)) {
        delete payload.options.customInterfaceId;
        delete payload.options.endpoint;
      } else {
        delete payload.options.endpoint;
      }

      if (isEdit) {
        const savedItem = await updateCabinetMenuItem(payload, dispatch as never);
        onAction?.({
          type: 'update',
          item: savedItem,
        });
      } else {
        const createdItem = await createCabinetMenuItem(payload, dispatch as never);
        const createdParentId = createdItem?.parentId || null;
        const siblingItems = (items || [])
          .filter((item) => (item?.parentId || null) === createdParentId)
          .slice()
          .sort((a, b) => {
            if (((a?.order as number) ?? 0) !== ((b?.order as number) ?? 0)) {
              return ((a?.order as number) ?? 0) - ((b?.order as number) ?? 0);
            }

            return String(a?.name || '').localeCompare(String(b?.name || ''));
          });

        const reorderedItems = [createdItem, ...siblingItems]
          .filter((item, index, list) =>
            item?.id && list.findIndex((candidate) => candidate?.id === item.id) === index,
          )
          .map((item, index) => ({
            ...item,
            parentId: createdParentId,
            order: index,
          }));

        await sortCabinetMenuItems(
          reorderedItems.map((item) => ({
            id: item.id,
            parentId: item.parentId || null,
            order: item.order,
          })),
          dispatch as never,
        );

        onAction?.({
          type: 'create',
          item: reorderedItems[0],
          reorderedItems,
        });
      }
      onClose?.();
    } catch (submitError) {
      setError((submitError as { message?: string })?.message || t('SaveError'));
    }
  };

  const parsedTranslations = React.useMemo(() => {
    try {
      return parseJsonObject(form.translations, t('TranslationsJsonError')) as Record<string, string>;
    } catch {
      return {};
    }
  }, [form.translations, t]);

  const dialogTitleName = form.name || value?.name || '-';

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {isEdit ? t('EditItemTitle', { name: dialogTitleName }) : t('CreateItemTitle')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select={true}
                sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}
                label={t('Type')}
                value={form.type}
                onChange={handleChange('type')}
                disabled={isSystem}
              >
                <MenuItem value="customInterface">{t('CustomInterfaceType')}</MenuItem>
                <MenuItem value="link">{t('LinkType')}</MenuItem>
                <MenuItem value="button">{t('ButtonType')}</MenuItem>
              </TextField>
              {isRouteType(form.type) ? (
                <TextField
                  fullWidth={true}
                  sx={{ flex: 1 }}
                  label={t('Route')}
                  value={form.route}
                  onChange={handleChange('route')}
                  disabled={isSystem}
                />
              ) : (
                <Autocomplete
                  fullWidth
                  sx={{ flex: 1 }}
                  disabled={isSystem}
                  options={customInterfaceOptions}
                  value={selectedCustomInterface}
                  onChange={(event, nextValue) => {
                    setForm((prev) => ({
                      ...prev,
                      customInterfaceId: nextValue?.id || '',
                      name: nextValue?.name || prev.name,
                      translations: nextValue?.name
                        ? stringifyObject(updateCurrentLocaleTranslation(
                          prev.translations,
                          currentLanguageCode,
                          nextValue.name,
                          t('TranslationsJsonError'),
                        ))
                        : prev.translations,
                    }));
                  }}
                  loading={customInterfacesLoading}
                  getOptionLabel={(option) => option?.name || option?.route || ''}
                  isOptionEqualToValue={(option, selectedValue) =>
                    option?.id === selectedValue?.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      label={t('CustomInterface')}
                    />
                  )}
                />
              )}
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <IconSelect
                sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}
                label={t('Icon')}
                searchLabel={t('IconSearch')}
                value={isSupportedIconName(form.icon) ? form.icon : ''}
                onChange={(nextValue) => {
                  setForm((prev) => ({
                    ...prev,
                    icon: nextValue,
                  }));
                }}
              />
              <TextField
                fullWidth={true}
                sx={{ flex: 1 }}
                label={t('MenuName')}
                value={form.name}
                onChange={handleNameChange}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={() => setTranslationsOpen(true)}
                      edge="end"
                    >
                      <TranslateIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select={true}
                fullWidth={true}
                label={t('Parent')}
                value={form.parentId}
                onChange={handleChange('parentId')}
              >
                <MenuItem value="">
                  {t('RootItem')}
                </MenuItem>
                {parentOptions.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name || item.id}
                      </Box>
                      {item.options?.system ? <SystemItemIcon title={t('SystemItem')} /> : null}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
      <CabinetMenuTranslationsDialog
        open={translationsOpen}
        onClose={() => setTranslationsOpen(false)}
        value={parsedTranslations}
        onSave={(nextTranslations) => {
          setForm((prev) => ({
            ...prev,
            name: getLocalizedName({ name: prev.name, translations: nextTranslations }, currentLanguageCode),
            translations: stringifyObject(nextTranslations),
          }));
        }}
      />
    </>
  );
};

export default CabinetMenuDialog;
