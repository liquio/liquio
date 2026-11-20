/**
 * Shape shared by the locale files. The locales have drifted apart (fr and ua lack some
 * en keys and have sections en lacks), so this is deliberately loose: a `locale` string
 * plus sections of string messages, without pinning one locale's keys onto the others.
 */
export interface Translations {
  locale: string;
  [section: string]: string | { [key: string]: string };
}
