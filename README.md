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

## Sound effects

Short original effects play for menus, game start, movement, rotation, landing,
stones, matches, cascades, bomb/flash/star pieces, level changes, and game over.
Open **Settings → Game audio** to mute or enable them; **Test sound** plays a
short preview. This preference lasts for the current session until local saving
is added. Sounds stop when the app backgrounds or the player pauses the game.
Device silent mode and media volume are respected. No microphone permission is needed.

The small PCM WAV sound pack is bundled for offline playback. Rebuild it with
`npm run sounds:build`. Audio uses `expo-audio`; rebuild an existing development
client once after adding this native package. Expo Go must match SDK 58.

The home screen has a looping original menu theme and a music button. On web,
tap that button or open a menu to start music after the required user interaction.
On mobile, menu music starts automatically when audio is enabled. It stops during
gameplay and in the background. **Game audio** mutes all audio; **Menu music**
controls just the theme. Both controls are available in Settings.

Correct matching plays a clear or cascade effect. When that match advances a
level, its clear sound finishes before the victory jingle. Game over plays a
distinct loss sound. Runs are endless survival, so victory feedback marks a level
advance rather than a final win screen.

## Game modes

- **Classic:** slower falling, no landing guide, and no instant drop.
- **Quick Play** (previously Comfort): faster falling, a landing guide, and an
  instant-drop button. Existing scores keep their original mode identifier.

## Checks

```sh
npm run lint
npx tsc --noEmit
node --experimental-strip-types --test tests/translations.test.mjs
npm run test:sounds
```

To check the interface, run `npm run web`, choose each language in Settings, and visit
the title screen, rules, high scores, gameplay, and pause screen. Check a small portrait
viewport and confirm that changing the language keeps the selected radio option visible.
