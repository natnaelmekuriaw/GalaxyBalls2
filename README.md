# Welcome to Galaxy Balls Game 👋
A mobile and web game built with React Native and Expo.

## Languages

Tap the language button on the home screen to open language settings, or open
**Settings → Language**, and select **English**, **አማርኛ**, or **Afaan Oromoo**.
The home button always shows the currently selected language.
The game menus, rules, controls, score displays, and game messages update immediately.
The selection lasts for the current app session; saving preferences is planned as a separate change.

Amharic uses bundled Noto Sans Ethiopic regular and bold fonts, available offline.
Their SIL Open Font License is included in `assets/fonts/OFL.txt`.
The translations should receive a native speaker review before release.

## Piece variety

Every new game starts with a two-block group and immediately previews a three-block
group, which falls after the first group lands. Later pieces mix two and three blocks
from level 1, including horizontal and vertical lines and four corner orientations.
Single-block specials still appear during play. The preview shows the exact queued
shape and colors. Four-block experiments remain disabled.

## Checks

```sh
npm run lint
npx tsc --noEmit
node --experimental-strip-types --test tests/translations.test.mjs
```

To check the interface, run `npm run web`, choose each language in Settings, and visit
the title screen, rules, high scores, gameplay, and pause screen. Check a small portrait
viewport and confirm that changing the language keeps the selected radio option visible.
