import type { Language } from '@/shared/i18n/translations';

const labels: Record<Language, Record<string, string>> = {
  "en": {
    "style": "Board style",
    "classic": "Classic",
    "jewel": "Jewel",
    "garden": "Garden",
    "pastel": "Pastel",
    "players": "Players",
    "humans": "People",
    "computers": "Computers",
    "start": "Play",
    "options": "Game options",
    "music": "Music",
    "sound": "Sound effects",
    "on": "On",
    "off": "Off",
    "purple": "Purple",
    "orange": "Orange",
    "board": "Board",
    "match": "Match setup",
    "close": "Close"
  },
  "am": {},
  "om": {}
};
export function ludoOption(language: Language, key: string): string {
  return labels[language]?.[key] ?? labels.en[key] ?? key;
}
