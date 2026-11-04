import type { Language } from '@/shared/i18n/translations';

const labels: Record<Language, Record<string, string>> = {
  "en": {},
  "am": {},
  "om": {}
};
export function ludoOption(language: Language, key: string): string {
  return labels[language]?.[key] ?? labels.en[key] ?? key;
}
