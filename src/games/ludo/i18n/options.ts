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
    "close": "Close",
    "resume": "Continue",
    "newGame": "New match",
    "roll": "Roll",
    "choose": "Tap a piece",
    "winning": "Winner",
    "saved": "Progress saves automatically",
    "quick": "Quick match",
    "volume": "Audio",
    "local": "Play together on this device",
    "sixPlayers": "Six-player board",
    "fourPlayers": "Classic board"
  },
  "am": {
    "style": "የሰሌዳ ቅጥ",
    "classic": "መደበኛ",
    "jewel": "ዕንቁ",
    "garden": "አትክልት",
    "pastel": "ለስላሳ ቀለም",
    "players": "ተጫዋቾች",
    "humans": "ሰዎች",
    "computers": "ኮምፒውተሮች",
    "start": "ተጫወት",
    "options": "የጨዋታ አማራጮች",
    "music": "ሙዚቃ",
    "sound": "የድምፅ ተፅእኖዎች",
    "on": "በርቷል",
    "off": "ጠፍቷል",
    "purple": "ሐምራዊ",
    "orange": "ብርቱካናማ",
    "board": "ሰሌዳ",
    "match": "የጨዋታ ዝግጅት",
    "close": "ዝጋ",
    "resume": "ቀጥል"
  },
  "om": {}
};
export function ludoOption(language: Language, key: string): string {
  return labels[language]?.[key] ?? labels.en[key] ?? key;
}
