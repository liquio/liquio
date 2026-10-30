import React from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import * as api from 'services/api';

interface Language {
  code?: string;
  id?: string;
  localizationLanguageCode?: string;
  name?: string;
  label?: string;
  title?: string;
}

const normalizeLanguages = (result: unknown): Language[] => {
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray((result as { data?: unknown })?.data)) {
    return (result as { data: Language[] }).data;
  }

  return [];
};

const getLanguageCode = (language: Language): string => (
  language?.code ||
  language?.id ||
  language?.localizationLanguageCode ||
  ''
);

const getPrimitiveText = (value: unknown): string => (
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
);

const getLanguageLabel = (language: Language): string => (
  getPrimitiveText(language?.name) ||
  getPrimitiveText(language?.label) ||
  getPrimitiveText(language?.title) ||
  getLanguageCode(language).toUpperCase()
);

interface CabinetMenuTranslationsDialogProps {
  open: boolean;
  onClose?: () => void;
  onSave?: (translations: Record<string, string>) => void;
  value?: Record<string, string>;
}

const CabinetMenuTranslationsDialog = ({
  open,
  onClose,
  onSave,
  value,
}: CabinetMenuTranslationsDialogProps) => {
  const t = useTranslate('CabinetMenuPage');
  const dispatch = useDispatch();
  const [languages, setLanguages] = React.useState<Language[]>([]);
  const [translations, setTranslations] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setTranslations(value || {});
    setError('');
  }, [open, value]);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isActive = true;

    const loadLanguages = async () => {
      setLoading(true);

      try {
        const result = await api.get('localization-languages', 'GET_CABINET_MENU_LANGUAGES', dispatch as never);
        if (isActive) {
          setLanguages(normalizeLanguages(result));
        }
      } catch (loadError) {
        if (isActive) {
          setLanguages([]);
          setError((loadError as { message?: string })?.message || t('TranslationsLoadError'));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadLanguages();

    return () => {
      isActive = false;
    };
  }, [dispatch, open, t]);

  const sortedLanguages = React.useMemo(() => (
    languages
      .slice()
      .sort((a, b) => String(getLanguageLabel(a)).localeCompare(String(getLanguageLabel(b))))
  ), [languages]);

  const handleChange = (code: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setTranslations((prev) => ({
      ...prev,
      [code]: nextValue,
    }));
  };

  const handleSave = () => {
    const nextTranslations = Object.entries(translations || {}).reduce((acc: Record<string, string>, [code, text]) => {
      if (typeof text === 'string' && text.trim()) {
        acc[code] = text.trim();
      }

      return acc;
    }, {});

    onSave?.(nextTranslations);
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('NameTranslationsTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={20} />
              <Typography variant="body2">{t('TranslationsLoading')}</Typography>
            </Stack>
          ) : null}
          {!loading && !sortedLanguages.length ? (
            <Typography variant="body2">{t('TranslationsEmpty')}</Typography>
          ) : null}
          {!loading ? sortedLanguages.map((language) => {
            const code = getLanguageCode(language);

            if (!code) {
              return null;
            }

            return (
              <TextField
                key={code}
                fullWidth
                label={getLanguageLabel(language)}
                placeholder={code.toUpperCase()}
                value={translations?.[code] || ''}
                onChange={handleChange(code)}
              />
            );
          }) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('Cancel')}
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {t('Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CabinetMenuTranslationsDialog;
