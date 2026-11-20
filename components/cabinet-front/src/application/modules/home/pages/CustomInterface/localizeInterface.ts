import { resolveLocalizationText } from 'helpers/localization';

type LocalizationOptions = Parameters<typeof resolveLocalizationText>[1];

// Walk values rather than serialized JSON so quotes and newlines in translations
// remain valid, and schema property names stay unchanged.
const localizeInterface = <T>(value: T, options: LocalizationOptions): T => {
  if (typeof value === 'string') {
    return resolveLocalizationText(value, options) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => localizeInterface(item, options)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localizeInterface(item, options)])
    ) as T;
  }
  return value;
};

export default localizeInterface;
