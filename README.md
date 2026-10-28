# Welcome to Galaxy Balls Game 👋
A mobile and web game built with React Native and Expo.

## Game artwork

The original block-and-orbit identity appears on the home screen, Games card,
app launcher, splash screen, web navigation, and favicon. Sources, palette, and
asset usage are documented in [the artwork guide](assets/branding/README.md).
Launcher and splash changes need a new native build to appear on an installed app.

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

The app saves your selected language, game audio, menu music, vibration, block
symbols, rotation choice, and the top five completed-run scores for Classic and
Quick Play. It restores them
before showing the menus or starting audio. An unfinished game appears as
**Resume Game** on the main menu, with its mode, score, and level. It stays paused
until you choose Resume Game.

The current board, falling piece position and colors, next-piece preview, score,
level, mode, rotation rules, and random sequence are saved after every game action
and gravity step. Pausing, returning to the main menu, leaving the game tab, or
backgrounding also keeps the checkpoint. Starting a new game asks for confirmation
if a saved game exists. **Cancel** (or the system back/close action) keeps the
saved game; **Replace and start** replaces it with the selected mode. High scores
and settings are preserved. With no saved game, play starts immediately. Game
over saves the high score and clears the unfinished game together.

Data stays on the device using AsyncStorage. On web, it stays in the current
browser for that site. Clearing app or browser data removes the saved scores and
preferences. Rebuild an existing development client after adding AsyncStorage;
the compatible version is included in Expo Go for SDK 58.

Saving starts immediately after a preference or game state changes. Writes are
ordered, with only the latest pending snapshot retained during rapid input.
Failed writes retry when the app backgrounds or another change is
saved. Invalid saved fields fall back to defaults. If storage cannot be read,
that session works in memory and leaves the unread save untouched. Settings
shows a message if changes cannot be saved.

## Game modes

Movement controls are grouped together as **Left · Down · Right** on the right
for easier reach with the right thumb. **Rotate** and Quick Play's instant **Drop**
sit in a separate group on the left, with different colors. The controls stay
near the right edge on wider screens and use touch targets at least 48 by 56
points. Buttons are disabled while paused or game over.

Tap a movement arrow for one step, or hold it to repeat after a short delay.
Releasing the button, sliding away, pausing, leaving gameplay, or backgrounding
stops the hold. Rotate and instant Drop remain single actions. A resumed game
keeps its original rotation rules; the saved rotation preference applies to new
games.

- **Classic:** slower falling, no landing guide, and no instant drop.
- **Quick Play** (previously Comfort): faster falling, a landing guide, and an
  instant-drop button. Existing scores keep their original mode identifier.

## Gameplay feedback

The level progress bar shows how many points you have toward the next level.
Matches and special clears show their cleared-block count and score gain, with
a brief colored board outline. Star, Bomb, and Flash also describe their effect.
Cascades and level-ups appear together when the same landing triggers both.
A Star with no nearby colored target explains why it did not clear blocks.
Feedback stays visible while paused and clears shortly after play continues.

The web navigation contains Game and Games. Settings contains player preferences;
engine checks run through `npm test` alongside the other automated checks.

## Screen layout

The board, preview, and pilot fit the space available after the score and controls
are laid out. They resize when the window changes without restarting the game or
changing the falling piece, preview, score, or saved progress. Controls retain
their touch target sizes.

Portrait keeps the score at the top and controls at the bottom. Short landscape
screens place the score and controls in a panel beside the arena to leave more
room for the board. Rotate and Drop stay to the left of the movement arrows in
both layouts. Native safe-area insets and web safe-area CSS keep gameplay clear
of screen cutouts and the home indicator.

The app configuration allows portrait and landscape. An existing installed native
build needs rebuilding to pick up that orientation setting.

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
For saving, change the language, both sound switches, vibration, block symbols,
and rotation choice, then close and reopen the
app, and check they are restored. Finish a scoring run in each mode and confirm
its Top 5 entry survives reopening. The data tests also cover delayed reads,
rapid changes, corrupt saves, write ordering, storage failures, and retrying.
For resuming, move and rotate pieces, place some blocks, pause, then close and
reopen the app. Resume Game should restore the board, current piece, preview,
score, and mode. Continue playing and verify the next piece follows the saved
preview. Finish the run and reopen again: its score should remain in Top 5 and
Resume Game should be gone. Existing saved language, audio settings, and scores
remain compatible.
With an unfinished game saved, tap Classic or Quick Play and cancel the
confirmation. Reopen and resume: the same game should remain. Repeat and choose
Replace and start: a fresh game should use the selected mode. Also check the
first-game and Play Again flows start immediately when no saved game exists.
For controls, check Classic and Quick Play at small phone widths in all three
languages. Verify the movement buttons stay together on the right, Rotate and
Drop stay on the left, and every control performs its labeled action. Quick Play
should show instant Drop; Classic should not. Check pressed and paused states too.
Hold each movement button, then release or slide off it: repeating should stop
without an extra move. Check pausing, leaving gameplay, backgrounding, and
returning to play; an old hold must never restart. Holding Rotate or Drop should
perform one action. Verify saved rotation settings are unchanged after resuming a
game with different rotation rules.
For feedback, trigger matches, Star, Bomb, Flash, a multi-wave cascade, and a level
advance. Verify simultaneous outcomes remain visible together, clear counts and
score gains agree with the board, and progress resets at a new level. Check a Star
with no colored target too. Repeat feedback checks in all three languages.
For screen fitting, check 320×480 and 390×844 portrait, approximately 568×320 and
844×390 landscape, and tablets in both orientations. The entire 6×10 board, 3×3
preview, pilot, score, and controls should remain visible in Classic and Quick
Play, in every language. Pause mid-fall, resize repeatedly, and verify the game
stays paused with the same board, piece position, preview, and score. Resume and
check movement, rotation, soft drop, and Quick Play's instant drop. Repeat on an
Android and iOS device with a screen cutout and bottom gesture area.
