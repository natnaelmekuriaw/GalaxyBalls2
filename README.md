# Welcome to Galaxy Balls Game 👋
A mobile and web game built with React Native and Expo.

## Languages

Tap the language button on the home screen to open language settings, or open
**Settings → Language**, and select **English**, **አማርኛ**, or **Afaan Oromoo**.
The home button always shows the currently selected language.
The game menus, rules, controls, score displays, and game messages update immediately.
The selected language is saved locally and restored when the app opens again.

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
short preview. Both game audio and menu music preferences are saved locally.
Sounds stop when the app backgrounds or the player pauses the game.
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

## Saved game data

The app saves your selected language, game audio switch, menu music switch, and
the top five completed-run scores for Classic and Quick Play. It restores them
before showing the menus or starting audio. Active games start fresh on reopening.

Data stays on the device using AsyncStorage. On web, it stays in the current
browser for that site. Clearing app or browser data removes the saved scores and
preferences. Rebuild an existing development client after adding AsyncStorage;
the compatible version is included in Expo Go for SDK 58.

Saving starts immediately after a preference changes or a run ends. Writes are
ordered, and failed writes retry when the app backgrounds or another change is
saved. Invalid saved fields fall back to defaults. If storage cannot be read,
that session works in memory and leaves the unread save untouched. Settings
shows a message if changes cannot be saved.

## Game modes

- **Classic:** slower falling, no landing guide, and no instant drop.
- **Quick Play** (previously Comfort): faster falling, a landing guide, and an
  instant-drop button. Existing scores keep their original mode identifier.

## Checks

```sh
npm run lint
npx tsc --noEmit
npm test
```

To check the interface, run `npm run web`, choose each language in Settings, and visit
the title screen, rules, high scores, gameplay, and pause screen. Check a small portrait
viewport and confirm that selecting a language returns to the translated main menu.
Open **Other Games** below Quick Play to see the collection. Galaxy Balls is the
only entry for now; opening it returns to the main menu to choose a play mode.
For saving, change the language and both sound switches, close and reopen the
app, and check they are restored. Finish a scoring run in each mode and confirm
its Top 5 entry survives reopening. The data tests also cover delayed reads,
rapid changes, corrupt saves, write ordering, storage failures, and retrying.
