import type { Language } from '@/shared/i18n/translations';

const en = {
  title: 'Ludo', subtitle: 'Race your colors home.', chooseMatch: 'Choose a match',
  computerMatches: 'Play against the computer', localMatches: 'Pass and play',
  vsBots: 'You vs {count} CPU', localPlayers: '{count} players on this device',
  computer: 'Computer', player: 'Player', turn: "{color}'s turn", roll: 'Roll the die',
  chooseToken: 'Choose a glowing piece', rollAgain: 'Roll again', waitingComputer: 'Computer is thinking…',
  noMove: 'No legal move.', threeSixes: 'Three sixes. Turn lost.',
  capture: 'Captured a piece! Roll again.', home: 'A piece reached home! Roll again.',
  win: '{color} wins!', playAgain: 'Play again', menu: 'Matches', resume: 'Resume match',
  newMatch: 'New match', replaceTitle: 'Start a new match?', replaceMessage: 'Your current Ludo match will be replaced.',
  cancel: 'Cancel', confirm: 'Start new match', rules: 'How to play',
  rulesBody: 'Roll a six to bring a piece out. Tap a glowing piece to move it. Safe stars cannot be captured. Capturing, finishing a piece, or rolling a six gives another turn. Three sixes in a row end your turn. Reach the center with an exact roll; bring all four pieces home to win.',
  token: '{color} piece {number}',
  board: 'Ludo board', dieValue: 'Die: {value}', backToGames: 'Back to games',
  loading: 'Loading match…', saveFailed: 'Could not save this match. Recent turns may be lost when the app closes.',
  red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue',
  homeCount: '{count}/4 home',
};

export type LudoTranslationKey = keyof typeof en;
type Messages = Record<LudoTranslationKey, string>;

const am: Messages = {
  title: 'ሉዶ', subtitle: 'ቀለሞችህን ወደ ቤት አድርስ።', chooseMatch: 'ጨዋታ ምረጥ',
  computerMatches: 'ከኮምፒውተር ጋር ተጫወት', localMatches: 'ተራ በተራ ተጫወቱ',
  vsBots: 'አንተ ከ{count} ኮምፒውተር ጋር', localPlayers: '{count} ተጫዋቾች በዚህ መሣሪያ',
  computer: 'ኮምፒውተር', player: 'ተጫዋች', turn: 'የ{color} ተራ', roll: 'ዳይስ ጣል',
  chooseToken: 'የሚያበራውን ቁራጭ ምረጥ', rollAgain: 'እንደገና ጣል', waitingComputer: 'ኮምፒውተሩ እያሰበ ነው…',
  noMove: 'መንቀሳቀስ አይቻልም።', threeSixes: 'ሶስት ስድስት። ተራው ጠፍቷል።',
  capture: 'ቁራጭ ተይዟል! እንደገና ጣል።', home: 'ቁራጭ ቤት ደርሷል! እንደገና ጣል።',
  win: '{color} አሸነፈ!', playAgain: 'እንደገና ተጫወት', menu: 'ጨዋታዎች', resume: 'ጨዋታውን ቀጥል',
  newMatch: 'አዲስ ጨዋታ', replaceTitle: 'አዲስ ጨዋታ ልጀምር?', replaceMessage: 'የአሁኑ የሉዶ ጨዋታ ይተካል።',
  cancel: 'ይቅር', confirm: 'አዲስ ጨዋታ ጀምር', rules: 'እንዴት እንጫወታለን?',
  rulesBody: 'ቁራጭ ለማስገባት ስድስት ጣል። ለማንቀሳቀስ የሚያበራውን ቁራጭ ንካ። በኮከብ ቦታ ያለ ቁራጭ አይያዝም። ቁራጭ ሲያዝ፣ ቤት ሲደርስ ወይም ስድስት ሲወጣ ተጨማሪ ተራ አለ። ሶስት ተከታታይ ስድስት ተራውን ያጠፋሉ። መሃል ለመድረስ ትክክለኛ ቁጥር ያስፈልጋል፤ አራቱንም ቁራጮች ቤት አድርስ።',
  token: 'የ{color} ቁራጭ {number}',
  board: 'የሉዶ ሰሌዳ', dieValue: 'ዳይስ፦ {value}', backToGames: 'ወደ ጨዋታዎች ተመለስ',
  loading: 'ጨዋታው እየተጫነ ነው…', saveFailed: 'ጨዋታውን ማስቀመጥ አልተቻለም። መተግበሪያውን ስትዘጋ የቅርብ ጊዜ ተራዎች ሊጠፉ ይችላሉ።',
  red: 'ቀይ', green: 'አረንጓዴ', yellow: 'ቢጫ', blue: 'ሰማያዊ', homeCount: '{count}/4 ቤት',
};

const om: Messages = {
  title: 'Ludoo', subtitle: 'Halluuwwan kee gara manaa geessi.', chooseMatch: 'Tapha filadhu',
  computerMatches: 'Koompiitara waliin taphadhu', localMatches: 'Walitti dabarsaa taphadhaa',
  vsBots: 'Ati fi koompiitara {count}', localPlayers: 'Taphattoota {count} meeshaa kana irratti',
  computer: 'Koompiitara', player: 'Taphataa', turn: 'Marsaa {color}', roll: 'Kiyuubii darbadhu',
  chooseToken: 'Caccabaa ifu filadhu', rollAgain: 'Irra deebiʼii darbadhu', waitingComputer: 'Koompiitarri yaadaa jira…',
  noMove: 'Sochiin hin jiru.', threeSixes: 'Jaha sadii. Marsaan dhume.',
  capture: 'Caccabaan qabame! Irra deebiʼii darbadhu.', home: 'Caccabaan mana gaʼe! Irra deebiʼii darbadhu.',
  win: '{color} injifate!', playAgain: 'Irra deebiʼii taphadhu', menu: 'Taphoota', resume: 'Tapha itti fufi',
  newMatch: 'Tapha haaraa', replaceTitle: 'Tapha haaraa jalqabuu?', replaceMessage: 'Taphni Ludoo ammaa bakka buufama.',
  cancel: 'Dhiisi', confirm: 'Tapha haaraa jalqabi', rules: 'Akkaataa taphaa',
  rulesBody: 'Caccabaa baasuuf jaha darbadhu. Caccabaa ifu tuqiitii sochoosi. Iddoon urjii qabu nageenya qaba. Caccabaa qabachuun, mana geessuun, yookaan jaha darbachuun marsaa dabalataa kenna. Jaha sadii walitti aanan marsaa xumuru. Gara giddugaleessaa galuuf lakkoofsi sirrii barbaachisa; caccaboota afran mana geessi.',
  token: 'Caccabaa {color} {number}',
  board: 'Gabatee Ludoo', dieValue: 'Kiyuubii: {value}', backToGames: 'Gara taphootaatti deebiʼi',
  loading: 'Taphni feʼamaa jira…', saveFailed: 'Tapha kana kuusuu hin dandeenye. Yeroo appicha cuftu marsaawwan dhihoo baduu dandaʼu.',
  red: 'Diimaa', green: 'Magariisa', yellow: 'Keelloo', blue: 'Cuquliisa', homeCount: '{count}/4 mana',
};

export const LUDO_TRANSLATIONS: Record<Language, Messages> = { en, am, om };

export function translateLudo(language: Language, key: LudoTranslationKey, values: Record<string, string | number> = {}): string {
  const message = LUDO_TRANSLATIONS[language]?.[key] ?? en[key];
  return message.replace(/\{(\w+)\}/g, (token, name: string) => values[name] === undefined ? token : String(values[name]));
}
